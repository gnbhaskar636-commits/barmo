"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { accountReady, authClient, subscribeAccount } from "@/lib/account/account";
import { getUid } from "@/lib/social/store";

export interface CloudDM {
  id: string;
  from: string;
  to: string;
  text: string;
  ts: number;
}
interface Row {
  id: string;
  from_uid: string;
  to_uid: string;
  body: string;
  created_at: string;
}
const toMsg = (r: Row): CloudDM => ({ id: r.id, from: r.from_uid, to: r.to_uid, text: r.body, ts: Date.parse(r.created_at) || Date.now() });
const SAFE = /^[\w-]{4,64}$/;

// Routing: cloud storage is only used when BOTH ends are accounts. Guests can't read the database,
// so messages to guests keep using the existing live/queued path. (Cached 5 min per person.)
const isAcct = new Map<string, { v: boolean; t: number }>();
async function recipientIsAccount(uid: string): Promise<boolean> {
  const hit = isAcct.get(uid);
  if (hit && Date.now() - hit.t < 300_000) return hit.v;
  const { data, error } = await authClient().rpc("account_uids", { uids: [uid] });
  if (error) return false;
  const v = Array.isArray(data) && data.includes(uid);
  isAcct.set(uid, { v, t: Date.now() });
  return v;
}

/** Best-effort cloud copy of a message I just sent. The live path has already delivered it; failures are ignored. */
export async function cloudSendDM(d: { id: string; text: string }, to: string) {
  try {
    const me = getUid();
    if (!accountReady() || !SAFE.test(me) || !SAFE.test(to) || !(await recipientIsAccount(to))) return;
    await authClient().from("direct_messages").insert({ id: d.id, from_uid: me, to_uid: to, body: d.text.slice(0, 500) });
  } catch {
    /* ignore: the live path is the fallback */
  }
}

/** Loads recent history once, then streams new messages sent to me. Calls onMsg(msg, live). Returns an unsubscribe. */
export function subscribeCloudDMs(onMsg: (m: CloudDM, live: boolean) => void): () => void {
  let ch: RealtimeChannel | null = null;
  let started = false;
  let stopped = false;
  const stop = () => {
    if (ch) void authClient().removeChannel(ch);
    ch = null;
    started = false;
  };
  const start = async () => {
    if (stopped) return;
    if (!accountReady()) return void (started && stop());
    if (started) return;
    started = true;
    try {
      const uid = getUid();
      if (!SAFE.test(uid)) return;
      const c = authClient();
      const { data } = await c
        .from("direct_messages")
        .select("id,from_uid,to_uid,body,created_at")
        .or(`from_uid.eq.${uid},to_uid.eq.${uid}`)
        .order("created_at", { ascending: false })
        .limit(200);
      ((data as Row[] | null) || []).reverse().forEach((r) => onMsg(toMsg(r), false));
      if (stopped) return;
      ch = c
        .channel("dm:" + uid)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: "to_uid=eq." + uid }, (p) => onMsg(toMsg(p.new as Row), true))
        .subscribe();
    } catch {
      started = false;
    }
  };
  const unsub = subscribeAccount(() => void start());
  void start();
  return () => {
    stopped = true;
    unsub();
    stop();
  };
}
