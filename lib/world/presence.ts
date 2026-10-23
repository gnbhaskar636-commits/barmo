import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import { sanitizeConfig, type AvatarConfig } from "@/lib/world/avatar";
import type { RemotePeerState } from "@/lib/world/world";
import { cleanGear, type Loadout } from "@/lib/economy/catalog";
import { VOICE_KINDS, type VoiceSignal } from "@/lib/world/voice";

export interface PresenceMeta {
  name: string;
  cfg: AvatarConfig;
  topic?: string;
  /** Profile headline shown under the name tag. */
  headline?: string;
  /** Shop cosmetics (aura, pet). Display only; shape-checked against the catalog on receipt. */
  gear?: Loadout;
}

export interface PresenceEvents {
  /** A peer joined or their meta changed. */
  onMeta: (id: string, meta: PresenceMeta) => void;
  /** A peer left. */
  onLeave: (id: string) => void;
  /** A peer moved. */
  onMove: (id: string, s: RemotePeerState) => void;
  /** `huddle` is set when the message was sent from inside a private circle. */
  onChat?: (id: string, text: string, huddle?: string) => void;
  onEmote?: (id: string, e: string) => void;
  /** Lumen Orb actions (music, theme, effects, shouts) from another player. Untrusted: validate before use. */
  onOrb?: (id: string, payload: Record<string, unknown>) => void;
  /** Voice-circle introductions from another player. Untrusted: validated before it gets here. */
  onRtc?: (id: string, s: VoiceSignal) => void;
  /** Connection state changed (useful for the HUD). */
  onStatus?: (connected: boolean, error?: string) => void;
  /** Called when my own channel status reaches "joined". */
  onJoined?: () => void;
}

/**
 * Wraps a Supabase realtime channel.
 *
 * - Presence: who is online right now, with rendering meta (name, avatar).
 *   Supabase prunes presence automatically when a client disconnects, so
 *   stale peers clean themselves up.
 * - Broadcast: transient movement updates at ~10 Hz. NOT persisted anywhere.
 *
 * Presence keys and Broadcast payloads are client-controlled and untrusted.
 * This channel is for guest display only; consumers must never use its values
 * for authorization or treat them as verified identities.
 */
export function connectPresence(
  db: SupabaseClient,
  roomId: string,
  uid: string,
  meta: PresenceMeta,
  ev: PresenceEvents
): RealtimeChannel {
  const channel = db.channel(`room:${roomId}`, {
    config: {
      broadcast: { self: false, ack: false },
      presence: { key: uid },
    },
  });

  const known = new Set<string>();

  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<{ user_id: string; name: string; cfg: AvatarConfig; topic?: string; headline?: string; gear?: unknown }>();
      const online = new Map<string, PresenceMeta>();
      Object.entries(state).forEach(([key, vals]) => {
        const p = vals?.[0];
        if (p && p.user_id && key && key !== uid) {
          online.set(p.user_id, { name: String(p.name || "Guest").slice(0, 20), cfg: sanitizeConfig(p.cfg || {}), topic: String(p.topic || "").slice(0, 40), headline: String(p.headline || "").slice(0, 60), gear: cleanGear(p.gear) });
        }
      });
      // Fire join/meta updates, and prune peers no longer present.
      online.forEach((m, id) => ev.onMeta(id, m));
      known.forEach((id) => {
        if (!online.has(id)) ev.onLeave(id);
      });
      known.clear();
      online.forEach((_, id) => known.add(id));
    })
    .on("presence", { event: "leave" }, ({ key }) => {
      if (key && key !== uid) ev.onLeave(key);
    })
    .on("broadcast", { event: "move" }, ({ payload }) => {
      const m = payload as { id: string; s: RemotePeerState };
      if (!m || typeof m.id !== "string" || !m.s) return;
      ev.onMove(m.id, m.s);
    })
    .on("broadcast", { event: "chat" }, ({ payload }) => {
      const m = payload as { id?: string; text?: string; h?: string };
      if (m && typeof m.id === "string" && typeof m.text === "string") ev.onChat?.(m.id, m.text.slice(0, 200), typeof m.h === "string" && m.h ? m.h.slice(0, 24) : undefined);
    })
    .on("broadcast", { event: "emote" }, ({ payload }) => {
      const m = payload as { id?: string; e?: string };
      if (m && typeof m.id === "string" && typeof m.e === "string") ev.onEmote?.(m.id, m.e);
    })
    .on("broadcast", { event: "rtc" }, ({ payload }) => {
      const m = payload as { id?: unknown; kind?: unknown; h?: unknown; to?: unknown; d?: unknown } | null;
      if (!m || typeof m.id !== "string" || typeof m.h !== "string" || m.h.length > 24) return;
      if (!VOICE_KINDS.includes(m.kind as VoiceSignal["kind"])) return;
      if (m.to !== undefined && (typeof m.to !== "string" || m.to.length > 96)) return;
      if (m.d !== undefined && (typeof m.d !== "object" || m.d === null)) return;
      ev.onRtc?.(m.id, { kind: m.kind as VoiceSignal["kind"], h: m.h, to: m.to as string | undefined, d: m.d });
    })
    .on("broadcast", { event: "orb" }, ({ payload }) => {
      const m = payload as { id?: string } | null;
      if (m && typeof m.id === "string") ev.onOrb?.(m.id, m as Record<string, unknown>);
    })
    .subscribe(async (status) => {
      // supabase-js reports "SUBSCRIBED" etc.; compare case-insensitively so every version works.
      const s = String(status).toLowerCase();
      if (s === "subscribed") {
        await channel.track({ user_id: uid, name: meta.name, cfg: meta.cfg, topic: meta.topic || "", headline: meta.headline || "", gear: meta.gear || {} });
        ev.onStatus?.(true);
        ev.onJoined?.();
      } else if (s === "channel_error" || s === "timed_out") {
        ev.onStatus?.(false, "Realtime connection problem. Retrying…");
      } else if (s === "closed") {
        ev.onStatus?.(false);
      }
    });

  return channel;
}

/** Send my presence meta (call after changing name/avatar). */
export async function updatePresenceMeta(channel: RealtimeChannel, uid: string, meta: PresenceMeta) {
  await channel.track({ user_id: uid, name: meta.name, cfg: meta.cfg, topic: meta.topic || "", headline: meta.headline || "", gear: meta.gear || {} });
}

export async function leavePresence(db: SupabaseClient, channel: RealtimeChannel) {
  await db.removeChannel(channel);
}
