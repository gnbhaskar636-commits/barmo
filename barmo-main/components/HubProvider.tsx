"use client";

import { cloudSendDM, subscribeCloudDMs } from "@/lib/account/messages";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import {
  cleanPub, getUid, load, loadProfile, save, shortCode, uuid,
  type CMsg, type DM, type Friend, type GMsg, type GroupInfo, type Notice, type Profile, type Pub,
  type QueueItem, type QuestState, type Report,
} from "@/lib/social/store";
import { EMPTY_QUESTS, QUESTS, levelOf } from "@/lib/social/quests";
import { play } from "@/lib/sound";

const up = (s: unknown) => String(s).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);

export interface Hub {
  ready: boolean;
  live: boolean;
  me: Profile | null;
  saveProfile: (p: Partial<Profile>) => void;
  online: Record<string, Pub>;
  friends: Friend[];
  reqIn: Pub[];
  reqOut: string[];
  notices: Notice[];
  unreadNotices: number;
  unreadDMs: number;
  threads: Record<string, DM[]>;
  lastRead: Record<string, number>;
  groups: GroupInfo[];
  gMsgs: Record<string, GMsg[]>;
  gMembers: Record<string, Pub[]>;
  cMsgs: Record<string, CMsg[]>;
  quests: QuestState;
  level: number;
  sendRequest: (to: Pub) => void;
  acceptRequest: (from: Pub) => void;
  declineRequest: (id: string) => void;
  removeFriend: (id: string) => void;
  sendDM: (to: string, text: string) => void;
  openThread: (id: string) => void;
  sendCommunity: (room: string, text: string) => void;
  createGroup: (name: string) => string;
  joinGroup: (code: string) => boolean;
  leaveGroup: (id: string) => void;
  sendGroup: (id: string, text: string) => void;
  inviteToGroup: (gid: string, friendId: string) => void;
  markNoticesRead: () => void;
  complete: (questId: string) => void;
  visitZone: (zoneId: string) => void;
  enableAlerts: () => void;
  blocked: string[];
  muted: string[];
  reports: Report[];
  block: (id: string) => void;
  unblock: (id: string) => void;
  mute: (id: string) => void;
  unmute: (id: string) => void;
  /** Saves a report on this device and returns text the person can copy and send. */
  report: (p: Pub, reason: string) => string;
}

const Ctx = createContext<Hub | null>(null);
export function useHub(): Hub {
  const c = useContext(Ctx);
  if (!c) throw new Error("useHub must be used inside HubProvider");
  return c;
}

export function HubProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [ready, setReady] = useState(false);
  const [live, setLive] = useState(false);
  const [me, setMe] = useState<Profile | null>(null);
  const [online, setOnline] = useState<Record<string, Pub>>({});
  const [friends, setFriends] = useState<Friend[]>([]);
  const [reqIn, setReqIn] = useState<Pub[]>([]);
  const [reqOut, setReqOut] = useState<string[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [threads, setThreads] = useState<Record<string, DM[]>>({});
  const [lastRead, setLastRead] = useState<Record<string, number>>({});
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [gMsgs, setGMsgs] = useState<Record<string, GMsg[]>>({});
  const [gMembers, setGMembers] = useState<Record<string, Pub[]>>({});
  const [cMsgs, setCMsgs] = useState<Record<string, CMsg[]>>({});
  const [quests, setQuests] = useState<QuestState>(EMPTY_QUESTS);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [muted, setMuted] = useState<string[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  // Latest state for use inside long-lived channel callbacks.
  const S = useRef({ me, online, friends, reqIn, reqOut, groups, queue, quests, lastRead, blocked, muted });
  S.current = { me, online, friends, reqIn, reqOut, groups, queue, quests, lastRead, blocked, muted };

  const dbRef = useRef<SupabaseClient | null>(null);
  const commRef = useRef<RealtimeChannel | null>(null);
  const commReady = useRef(false);
  const outCh = useRef(new Map<string, { ch: RealtimeChannel; ready: Promise<void>; t: number }>());
  const groupCh = useRef(new Map<string, { ch: RealtimeChannel; ready: boolean }>());
  const seen = useRef(new Set<string>());
  const pinged = useRef(new Set<string>());
  const lastBrowserNotice = useRef(0);

  // ---------- load from storage ----------
  useEffect(() => {
    setMe(loadProfile());
    setFriends(load<Friend[]>("friends", []));
    setReqIn(load<Pub[]>("reqIn", []));
    setReqOut(load<string[]>("reqOut", []));
    setNotices(load<Notice[]>("notices", []));
    setThreads(load<Record<string, DM[]>>("threads", {}));
    setLastRead(load<Record<string, number>>("lastRead", {}));
    setGroups(load<GroupInfo[]>("groups", []));
    setGMsgs(load<Record<string, GMsg[]>>("gMsgs", {}));
    setCMsgs(load<Record<string, CMsg[]>>("cMsgs", {}));
    setQueue(load<QueueItem[]>("queue", []));
    setBlocked(load<string[]>("blocked", []));
    setMuted(load<string[]>("muted", []));
    setReports(load<Report[]>("reports", []));
    const q = load<QuestState>("quests", EMPTY_QUESTS);
    // daily streak
    const t = today();
    if (q.last !== t) {
      const y = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
      q.streak = q.last === y ? q.streak + 1 : 1;
      q.last = t;
      q.xp += 5;
    }
    setQuests({ ...EMPTY_QUESTS, ...q });
    setReady(true);
  }, []);

  useEffect(() => { if (ready && me) save("profile", me); }, [ready, me]);
  useEffect(() => { if (ready) save("friends", friends); }, [ready, friends]);
  useEffect(() => { if (ready) save("reqIn", reqIn); }, [ready, reqIn]);
  useEffect(() => { if (ready) save("reqOut", reqOut); }, [ready, reqOut]);
  useEffect(() => { if (ready) save("notices", notices.slice(0, 60)); }, [ready, notices]);
  useEffect(() => { if (ready) save("threads", threads); }, [ready, threads]);
  useEffect(() => { if (ready) save("lastRead", lastRead); }, [ready, lastRead]);
  useEffect(() => { if (ready) save("groups", groups); }, [ready, groups]);
  useEffect(() => { if (ready) save("gMsgs", gMsgs); }, [ready, gMsgs]);
  useEffect(() => { if (ready) save("cMsgs", cMsgs); }, [ready, cMsgs]);
  useEffect(() => { if (ready) save("queue", queue); }, [ready, queue]);
  useEffect(() => { if (ready) save("quests", quests); }, [ready, quests]);
  useEffect(() => { if (ready) save("blocked", blocked); }, [ready, blocked]);
  useEffect(() => { if (ready) save("muted", muted); }, [ready, muted]);
  useEffect(() => { if (ready) save("reports", reports.slice(-50)); }, [ready, reports]);

  // ---------- helpers ----------
  const browserNotify = useCallback((title: string, body: string) => {
    try {
      if (typeof document === "undefined" || !document.hidden) return;
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      if (Date.now() - lastBrowserNotice.current < 3000) return;
      lastBrowserNotice.current = Date.now();
      new Notification(title, { body });
    } catch {
      /* ignore */
    }
  }, []);

  const addNotice = useCallback((n: Omit<Notice, "id" | "ts" | "read">, toastIt = true) => {
    setNotices((l) => [{ ...n, id: uuid(), ts: Date.now(), read: false }, ...l].slice(0, 60));
    if (toastIt) toast(n.text);
    play("notify");
    browserNotify("BARMO", n.text);
  }, [toast, browserNotify]);

  const complete = useCallback((id: string) => {
    const q = QUESTS.find((x) => x.id === id);
    if (!q) return;
    setQuests((s) => {
      if (s.done[id]) return s;
      const next = { ...s, done: { ...s.done, [id]: Date.now() }, xp: s.xp + q.xp };
      const before = levelOf(s.xp), after = levelOf(next.xp);
      setTimeout(() => toast(`+${q.xp} XP · ${q.title}` + (after > before ? ` · Level ${after}! 🎉` : "")), 0);
      return next;
    });
  }, [toast]);

  const visitZone = useCallback((zid: string) => {
    setQuests((s) => (s.visited.includes(zid) ? s : { ...s, visited: [...s.visited, zid] }));
    complete("zone_" + zid);
  }, [complete]);

  const sendTo = useCallback(async (to: string, event: string, payload: unknown) => {
    const db = dbRef.current;
    if (!db) throw new Error("offline");
    let e = outCh.current.get(to);
    if (!e) {
      const ch = db.channel("inbox:" + to, { config: { broadcast: { self: false, ack: false } } });
      const rdy = new Promise<void>((res) => {
        const timer = setTimeout(res, 5000);
        ch.subscribe((s) => {
          if (up(s) === "SUBSCRIBED") { clearTimeout(timer); res(); }
        });
      });
      e = { ch, ready: rdy, t: Date.now() };
      outCh.current.set(to, e);
    }
    await e.ready;
    await e.ch.send({ type: "broadcast", event, payload });
    e.t = Date.now();
  }, []);

  /** Deliver now if the person is online, otherwise queue until they show up. */
  const deliver = useCallback((to: string, event: string, payload: unknown) => {
    const item: QueueItem = { id: uuid(), to, event, payload, ts: Date.now() };
    if (S.current.online[to] && dbRef.current) {
      sendTo(to, event, payload).catch(() => setQueue((q) => [...q, item].slice(-100)));
    } else {
      setQueue((q) => [...q, item].slice(-100));
    }
  }, [sendTo]);

  const pubOf = (p: Profile): Pub => ({ id: p.id, name: p.name, av: p.av, bio: p.bio, status: p.status, interests: p.interests, acc: p.acc, top: p.top, look: p.look, headline: p.headline, openTo: p.openTo, style: p.style, langs: p.langs, unique: p.unique, askMe: p.askMe });

  const becomeFriends = useCallback((p: Pub) => {
    setFriends((f) => (f.some((x) => x.id === p.id) ? f.map((x) => (x.id === p.id ? { ...x, ...p } : x)) : [...f, { ...p, since: Date.now() }]));
    setReqIn((r) => r.filter((x) => x.id !== p.id));
    setReqOut((r) => r.filter((x) => x !== p.id));
    complete("friend");
  }, [complete]);

  // ---------- community + inbox channels ----------
  const meId = me?.id;
  useEffect(() => {
    if (!ready || !meId) return;
    if (!isSupabaseConfigured()) { setLive(false); return; }
    let db: SupabaseClient;
    try { db = supabaseBrowser(); } catch { setLive(false); return; }
    dbRef.current = db;
    const uid = meId;

    const comm = db.channel("community", { config: { broadcast: { self: false, ack: false }, presence: { key: uid } } });
    commRef.current = comm;
    comm
      .on("presence", { event: "sync" }, () => {
        const st = comm.presenceState<Partial<Pub>>();
        const o: Record<string, Pub> = {};
        Object.entries(st).forEach(([k, v]) => {
          const p = v?.[0];
          if (p && k !== uid && !S.current.blocked.includes(k)) o[k] = cleanPub(p, k);
        });
        setOnline(o);
        // keep stored friend cards fresh
        setFriends((f) => f.map((x) => (o[x.id] ? { ...x, ...o[x.id] } : x)));
      })
      .on("broadcast", { event: "msg" }, ({ payload }) => {
        const m = payload as Partial<CMsg> | null;
        if (!m || typeof m.id !== "string" || typeof m.text !== "string" || typeof m.room !== "string" || typeof m.from !== "string") return;
        if (m.from === uid || seen.current.has(m.id)) return;
        if (S.current.blocked.includes(m.from) || S.current.muted.includes(m.from)) return;
        seen.current.add(m.id);
        const msg: CMsg = {
          id: m.id, room: m.room.slice(0, 20), from: m.from,
          name: String(m.name || "Guest").slice(0, 20),
          av: cleanPub({ av: m.av }, m.from).av,
          text: m.text.slice(0, 300), ts: Date.now(),
        };
        setCMsgs((c) => ({ ...c, [msg.room]: [...(c[msg.room] || []), msg].slice(-60) }));
      })
      .subscribe(async (s) => {
        const u = up(s);
        if (u === "SUBSCRIBED") {
          commReady.current = true;
          setLive(true);
          if (S.current.me) await comm.track(pubOf(S.current.me));
        } else if (u === "CHANNEL_ERROR" || u === "TIMED_OUT" || u === "CLOSED") {
          commReady.current = false;
          setLive(false);
        }
      });

    const inbox = db.channel("inbox:" + uid, { config: { broadcast: { self: false, ack: false } } });
    inbox
      .on("broadcast", { event: "req" }, ({ payload }) => {
        const m = payload as { id?: string; from?: Partial<Pub> } | null;
        if (!m?.from || typeof m.from.id !== "string" || m.from.id === uid) return;
        const from = cleanPub(m.from, m.from.id);
        if (S.current.blocked.includes(from.id)) return;
        if (S.current.friends.some((f) => f.id === from.id)) return;
        if (S.current.reqOut.includes(from.id)) {
          // they asked me back: auto-accept
          becomeFriends(from);
          deliver(from.id, "acc", { id: uuid(), from: S.current.me ? pubOf(S.current.me) : null });
          addNotice({ type: "acc", text: `You and ${from.name} are now friends`, from });
          return;
        }
        if (S.current.reqIn.some((r) => r.id === from.id)) return;
        setReqIn((r) => [...r, from]);
        addNotice({ type: "req", text: `${from.name} sent you a friend request`, from });
      })
      .on("broadcast", { event: "acc" }, ({ payload }) => {
        const m = payload as { id?: string; from?: Partial<Pub> } | null;
        if (!m?.from || typeof m.from.id !== "string") return;
        if (S.current.blocked.includes(m.from.id)) return;
        if (!S.current.reqOut.includes(m.from.id) && !S.current.friends.some((f) => f.id === m.from!.id)) return;
        const from = cleanPub(m.from, m.from.id);
        if (S.current.friends.some((f) => f.id === from.id)) return;
        becomeFriends(from);
        addNotice({ type: "acc", text: `${from.name} accepted your friend request`, from });
      })
      .on("broadcast", { event: "dm" }, ({ payload }) => {
        const m = payload as Partial<DM> | null;
        if (!m || typeof m.id !== "string" || typeof m.from !== "string" || typeof m.text !== "string") return;
        if (seen.current.has(m.id)) return;
        seen.current.add(m.id);
        if (S.current.blocked.includes(m.from)) return;
        if (!S.current.friends.some((f) => f.id === m.from)) return; // friends only
        const d: DM = { id: m.id, from: m.from, text: m.text.slice(0, 500), ts: typeof m.ts === "number" ? m.ts : Date.now() };
        setThreads((t) => ({ ...t, [d.from]: [...(t[d.from] || []), d].slice(-100) }));
        const fr = S.current.friends.find((f) => f.id === d.from);
        if (!S.current.muted.includes(d.from)) { play("pop"); browserNotify(fr?.name || "New message", d.text); }
      })
      .on("broadcast", { event: "ginv" }, ({ payload }) => {
        const m = payload as { id?: string; gid?: string; gname?: string; from?: Partial<Pub> } | null;
        if (!m || typeof m.gid !== "string" || !m.from || typeof m.from.id !== "string") return;
        if (S.current.blocked.includes(m.from.id)) return;
        if (!S.current.friends.some((f) => f.id === m.from!.id)) return;
        if (S.current.groups.some((g) => g.id === m.gid)) return;
        const from = cleanPub(m.from, m.from.id);
        const gname = String(m.gname || "Group").slice(0, 30);
        addNotice({ type: "ginv", text: `${from.name} invited you to “${gname}”`, from, gid: m.gid.slice(0, 12), gname });
      })
      .subscribe();

    const idle = setInterval(() => {
      outCh.current.forEach((e, k) => {
        if (Date.now() - e.t > 60_000) { void db.removeChannel(e.ch); outCh.current.delete(k); }
      });
    }, 30_000);

    return () => {
      clearInterval(idle);
      commReady.current = false;
      void db.removeChannel(comm);
      void db.removeChannel(inbox);
      outCh.current.forEach((e) => void db.removeChannel(e.ch));
      outCh.current.clear();
      commRef.current = null;
      setOnline({});
      setLive(false);
    };
  }, [ready, meId, addNotice, becomeFriends, browserNotify, deliver]);

  // keep my presence card fresh
  useEffect(() => {
    if (me && commReady.current && commRef.current) void commRef.current.track(pubOf(me));
  }, [me]);

  // flush queued messages + re-ping pending requests when people come online
  useEffect(() => {
    if (!me) return;
    const ids = Object.keys(online);
    if (!ids.length) return;
    const timer = setTimeout(() => {
      const keep: QueueItem[] = [];
      S.current.queue.forEach((it) => {
        if (Date.now() - it.ts > 7 * 86_400_000) return;
        if (S.current.online[it.to]) {
          sendTo(it.to, it.event, it.payload).catch(() => undefined);
        } else keep.push(it);
      });
      if (keep.length !== S.current.queue.length) setQueue(keep);
      S.current.reqOut.forEach((id) => {
        if (S.current.online[id] && !pinged.current.has(id) && S.current.me) {
          pinged.current.add(id);
          sendTo(id, "req", { id: uuid(), from: pubOf(S.current.me) }).catch(() => undefined);
        }
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [online, me, sendTo]);

  // ---------- group channels ----------
  const groupKey = groups.map((g) => g.id).join(",");
  useEffect(() => {
    const db = dbRef.current;
    if (!ready || !meId || !db || !live) return;
    const uid = meId;
    const want = new Set(groups.map((g) => g.id));
    groupCh.current.forEach((e, id) => {
      if (!want.has(id)) { void db.removeChannel(e.ch); groupCh.current.delete(id); }
    });
    groups.forEach((g) => {
      if (groupCh.current.has(g.id)) return;
      const ch = db.channel("group:" + g.id, { config: { broadcast: { self: false, ack: false }, presence: { key: uid } } });
      const entry = { ch, ready: false };
      groupCh.current.set(g.id, entry);
      ch.on("presence", { event: "sync" }, () => {
        const st = ch.presenceState<{ pub?: Partial<Pub>; gname?: string }>();
        const list: Pub[] = [];
        let gname = "";
        Object.entries(st).forEach(([k, v]) => {
          const p = v?.[0];
          if (!p) return;
          if (p.pub) list.push(cleanPub(p.pub, k));
          if (typeof p.gname === "string" && p.gname) gname = p.gname.slice(0, 30);
        });
        setGMembers((m) => ({ ...m, [g.id]: list }));
        if (gname) setGroups((gs) => gs.map((x) => (x.id === g.id && x.name.startsWith("Group ") ? { ...x, name: gname } : x)));
      }).on("broadcast", { event: "gm" }, ({ payload }) => {
        const m = payload as Partial<GMsg> | null;
        if (!m || typeof m.id !== "string" || typeof m.text !== "string" || typeof m.from !== "string") return;
        if (m.from === uid || seen.current.has(m.id)) return;
        if (S.current.blocked.includes(m.from) || S.current.muted.includes(m.from)) return;
        seen.current.add(m.id);
        const msg: GMsg = { id: m.id, from: m.from, name: String(m.name || "Guest").slice(0, 20), text: m.text.slice(0, 300), ts: Date.now() };
        setGMsgs((c) => ({ ...c, [g.id]: [...(c[g.id] || []), msg].slice(-100) }));
      }).subscribe(async (s) => {
        if (up(s) === "SUBSCRIBED") {
          entry.ready = true;
          const cur = S.current.groups.find((x) => x.id === g.id);
          if (S.current.me) await ch.track({ pub: pubOf(S.current.me), gname: cur?.name || g.name });
        }
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, meId, live, groupKey]);

  useEffect(() => () => {
    const db = dbRef.current;
    groupCh.current.forEach((e) => { if (db) void db.removeChannel(e.ch); });
    groupCh.current.clear();
  }, []);

  // ---------- actions ----------
  const saveProfile = useCallback((p: Partial<Profile>) => {
    setMe((cur) => {
      const base = cur || { id: getUid(), name: "Guest", av: "atlas", bio: "", status: "Open to chat", interests: [] };
      const next = cleanPub({ ...base, ...p }, base.id);
      if (next.bio && next.interests.length) setTimeout(() => complete("profile"), 0);
      if ((next.acc && next.acc !== "none") || next.top !== undefined || (next.look && Object.keys(next.look).length)) setTimeout(() => complete("style"), 0);
      return next;
    });
  }, [complete]);

  const sendRequest = useCallback((to: Pub) => {
    const mine = S.current.me;
    if (!mine || to.id === mine.id) return;
    if (S.current.blocked.includes(to.id)) { toast("Unblock this person first"); return; }
    if (S.current.friends.some((f) => f.id === to.id) || S.current.reqOut.includes(to.id)) return;
    if (S.current.reqIn.some((r) => r.id === to.id)) { // they already asked me
      becomeFriends(to);
      deliver(to.id, "acc", { id: uuid(), from: pubOf(mine) });
      return;
    }
    setReqOut((r) => [...r, to.id]);
    pinged.current.add(to.id);
    deliver(to.id, "req", { id: uuid(), from: pubOf(mine) });
    complete("request");
    toast(`Request sent to ${to.name}`);
  }, [becomeFriends, deliver, complete, toast]);

  const acceptRequest = useCallback((from: Pub) => {
    const mine = S.current.me;
    if (!mine) return;
    becomeFriends(from);
    deliver(from.id, "acc", { id: uuid(), from: pubOf(mine) });
    setNotices((n) => n.map((x) => (x.type === "req" && x.from?.id === from.id ? { ...x, read: true } : x)));
    toast(`You and ${from.name} are friends`);
  }, [becomeFriends, deliver, toast]);

  const declineRequest = useCallback((id: string) => {
    setReqIn((r) => r.filter((x) => x.id !== id));
    setNotices((n) => n.map((x) => (x.type === "req" && x.from?.id === id ? { ...x, read: true } : x)));
  }, []);

  const removeFriend = useCallback((id: string) => {
    setFriends((f) => f.filter((x) => x.id !== id));
  }, []);

  // Cloud messages (signed-in friends only): history on any device + delivery while the sender is offline.
  useEffect(() => {
    if (!ready) return;
    return subscribeCloudDMs((m, live) => {
      const mine = S.current.me;
      if (!mine) return;
      const other = m.from === mine.id ? m.to : m.from;
      if (S.current.blocked.includes(other) || !S.current.friends.some((f) => f.id === other)) return;
      const d: DM = { id: m.id, from: m.from, text: m.text.slice(0, 500), ts: m.ts };
      setThreads((t) => {
        const l = t[other] || [];
        if (l.some((x) => x.id === d.id)) return t; // already arrived via the live path
        return { ...t, [other]: [...l, d].sort((a, b) => a.ts - b.ts).slice(-100) };
      });
      if (live && m.from !== mine.id && !seen.current.has(m.id) && !S.current.muted.includes(other)) {
        play("pop");
        browserNotify(S.current.friends.find((f) => f.id === other)?.name || "New message", d.text);
      }
      seen.current.add(m.id);
    });
  }, [ready]);

  const sendDM = useCallback((to: string, text: string) => {
    const mine = S.current.me;
    const t = text.trim().slice(0, 500);
    if (!mine || !t || !S.current.friends.some((f) => f.id === to)) return;
    const d: DM = { id: uuid(), from: mine.id, text: t, ts: Date.now() };
    setThreads((th) => ({ ...th, [to]: [...(th[to] || []), d].slice(-100) }));
    setLastRead((l) => ({ ...l, [to]: Date.now() }));
    deliver(to, "dm", d);
    void cloudSendDM(d, to); // also store in the cloud when both people have accounts
    complete("dm");
  }, [deliver, complete]);

  const openThread = useCallback((id: string) => setLastRead((l) => ({ ...l, [id]: Date.now() })), []);

  const sendCommunity = useCallback((room: string, text: string) => {
    const mine = S.current.me;
    const t = text.trim().slice(0, 300);
    if (!mine || !t) return;
    const msg: CMsg = { id: uuid(), room, from: mine.id, name: mine.name, av: mine.av, text: t, ts: Date.now() };
    seen.current.add(msg.id);
    setCMsgs((c) => ({ ...c, [room]: [...(c[room] || []), msg].slice(-60) }));
    void commRef.current?.send({ type: "broadcast", event: "msg", payload: msg });
    complete("community");
  }, [complete]);

  const createGroup = useCallback((name: string) => {
    const id = shortCode();
    const n = name.trim().slice(0, 30) || "My group";
    setGroups((g) => [...g, { id, name: n, joined: Date.now() }]);
    complete("group");
    return id;
  }, [complete]);

  const joinGroup = useCallback((code: string) => {
    const id = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
    if (id.length < 4) return false;
    if (S.current.groups.some((g) => g.id === id)) return true;
    setGroups((g) => [...g, { id, name: "Group " + id, joined: Date.now() }]);
    complete("group");
    return true;
  }, [complete]);

  const leaveGroup = useCallback((id: string) => {
    setGroups((g) => g.filter((x) => x.id !== id));
    setGMsgs((m) => { const n = { ...m }; delete n[id]; return n; });
  }, []);

  const sendGroup = useCallback((id: string, text: string) => {
    const mine = S.current.me;
    const t = text.trim().slice(0, 300);
    const e = groupCh.current.get(id);
    if (!mine || !t) return;
    const msg: GMsg = { id: uuid(), from: mine.id, name: mine.name, text: t, ts: Date.now() };
    seen.current.add(msg.id);
    setGMsgs((c) => ({ ...c, [id]: [...(c[id] || []), msg].slice(-100) }));
    if (e) void e.ch.send({ type: "broadcast", event: "gm", payload: msg });
  }, []);

  const inviteToGroup = useCallback((gid: string, friendId: string) => {
    const mine = S.current.me;
    const g = S.current.groups.find((x) => x.id === gid);
    if (!mine || !g) return;
    deliver(friendId, "ginv", { id: uuid(), gid, gname: g.name, from: pubOf(mine) });
    toast("Invite sent");
  }, [deliver, toast]);

  const markNoticesRead = useCallback(() => setNotices((n) => n.map((x) => ({ ...x, read: true }))), []);

  const enableAlerts = useCallback(() => {
    try {
      if (typeof Notification === "undefined") { toast("This browser does not support alerts"); return; }
      void Notification.requestPermission().then((p) => toast(p === "granted" ? "Browser alerts on" : "Alerts blocked in browser settings"));
    } catch {
      toast("Could not enable alerts");
    }
  }, [toast]);

  const block = useCallback((id: string) => {
    if (!id || id === S.current.me?.id) return;
    setBlocked((b) => (b.includes(id) ? b : [...b, id]));
    setMuted((m) => m.filter((x) => x !== id));
    setFriends((f) => f.filter((x) => x.id !== id));
    setReqIn((r) => r.filter((x) => x.id !== id));
    setReqOut((r) => r.filter((x) => x !== id));
    setThreads((t) => { const n = { ...t }; delete n[id]; return n; });
    setOnline((o) => { const n = { ...o }; delete n[id]; return n; });
    setQueue((q) => q.filter((x) => x.to !== id));
    toast("Blocked. They can no longer message or request you.");
  }, [toast]);
  const unblock = useCallback((id: string) => setBlocked((b) => b.filter((x) => x !== id)), []);
  const mute = useCallback((id: string) => {
    setMuted((m) => (m.includes(id) ? m : [...m, id]));
    toast("Muted. Their chat messages are hidden.");
  }, [toast]);
  const unmute = useCallback((id: string) => setMuted((m) => m.filter((x) => x !== id)), []);
  const report = useCallback((p: Pub, reason: string) => {
    const r: Report = { id: uuid(), target: p.id, name: p.name, reason: reason.slice(0, 40), ts: Date.now() };
    setReports((l) => [...l, r]);
    return `BARMO report\nPlayer: ${p.name}\nPlayer ID: ${p.id}\nReason: ${r.reason}\nTime: ${new Date(r.ts).toISOString()}`;
  }, []);

  const unreadNotices = notices.filter((n) => !n.read).length;
  const unreadDMs = useMemo(() => {
    let c = 0;
    Object.entries(threads).forEach(([id, l]) => {
      const lr = lastRead[id] || 0;
      c += l.filter((m) => m.from === id && m.ts > lr).length;
    });
    return c;
  }, [threads, lastRead]);

  const value: Hub = {
    ready, live, me, saveProfile, online, friends, reqIn, reqOut, notices, unreadNotices, unreadDMs,
    threads, lastRead, groups, gMsgs, gMembers, cMsgs, quests, level: levelOf(quests.xp),
    sendRequest, acceptRequest, declineRequest, removeFriend, sendDM, openThread, sendCommunity,
    createGroup, joinGroup, leaveGroup, sendGroup, inviteToGroup, markNoticesRead, complete, visitZone, enableAlerts,
    blocked, muted, reports, block, unblock, mute, unmute, report,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
