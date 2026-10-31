import type { Room } from "livekit-client";
import type { VoiceState } from "@/lib/world/voice";

/** Thrown when LiveKit is not set up on the server, so the app can use direct voice instead. */
export class LiveKitUnavailable extends Error {}

export interface LiveKitOptions {
  myId: string;
  roomId: string;
  name: string;
  onChange: (s: VoiceState) => void;
  /** id null = me */
  onSpeaking: (id: string | null, on: boolean) => void;
  isBlocked: (id: string) => boolean;
  isMuted: (id: string) => boolean;
}

/** Voice for a private circle through LiveKit (scales better and connects through strict networks). */
export function createLiveKitVoice(o: LiveKitOptions) {
  let room: Room | null = null;
  let circle: string | null = null;
  let muted = false;
  let speaking = new Set<string>();
  const audios = new Set<HTMLElement>();

  const emit = () => o.onChange({ active: !!room, muted, peers: room ? room.remoteParticipants.size : 0 });

  const cleanup = () => {
    audios.forEach((a) => a.remove());
    audios.clear();
    speaking.forEach((id) => o.onSpeaking(id === o.myId ? null : id, false));
    speaking = new Set();
    room = null;
    circle = null;
    muted = false;
    emit();
  };

  return {
    active: () => !!room,
    circle: () => circle,
    async start(h: string) {
      if (room) return;
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: o.roomId, h, id: o.myId, name: o.name }),
      });
      if (res.status === 501) throw new LiveKitUnavailable("LiveKit is not configured");
      const j = (await res.json().catch(() => ({}))) as { token?: string; url?: string; error?: string };
      if (!res.ok || !j.token || !j.url) throw new Error(j.error || "Could not start voice");

      const lk = await import("livekit-client");
      const r = new lk.Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      r.on(lk.RoomEvent.TrackSubscribed, (track, _pub, p) => {
        if (track.kind !== lk.Track.Kind.Audio || o.isBlocked(p.identity.split("~")[0])) return;
        const el = track.attach();
        el.style.display = "none";
        el.muted = o.isMuted(p.identity.split("~")[0]);
        document.body.appendChild(el);
        audios.add(el);
      });
      r.on(lk.RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((el) => {
          audios.delete(el);
          el.remove();
        });
      });
      r.on(lk.RoomEvent.ParticipantConnected, emit);
      r.on(lk.RoomEvent.ParticipantDisconnected, emit);
      r.on(lk.RoomEvent.ActiveSpeakersChanged, (list) => {
        const now = new Set(list.map((p) => p.identity));
        speaking.forEach((id) => {
          if (!now.has(id)) o.onSpeaking(id === o.myId ? null : id, false);
        });
        now.forEach((id) => {
          if (!speaking.has(id)) o.onSpeaking(id === o.myId ? null : id, true);
        });
        speaking = now;
      });
      r.on(lk.RoomEvent.Disconnected, cleanup);
      room = r;
      circle = h;
      try {
        await r.connect(j.url, j.token);
        await r.localParticipant.setMicrophoneEnabled(true);
        void r.startAudio().catch(() => {});
      } catch (e) {
        try {
          await r.disconnect();
        } catch {
          /* ignore */
        }
        cleanup();
        throw e;
      }
      emit();
    },
    stop() {
      const r = room;
      if (!r) return;
      void r.disconnect();
      cleanup();
    },
    setMuted(m: boolean) {
      muted = m;
      void room?.localParticipant.setMicrophoneEnabled(!m);
      emit();
    },
  };
}
