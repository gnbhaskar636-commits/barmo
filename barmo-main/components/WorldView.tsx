"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ROOMS, getRoom, isRoomId, spawnFor, type RoomId } from "@/lib/world/rooms";
import { AVS, type AvatarConfig } from "@/lib/world/avatar";
import { connectPresence, leavePresence } from "@/lib/world/presence";
import { REACTIONS, runWorld, type RemotePeerState, type WorldContext } from "@/lib/world/world";
import { createVoice, type VoiceCtl, type VoiceState } from "@/lib/world/voice";
import { createLiveKitVoice, LiveKitUnavailable } from "@/lib/world/livekitVoice";
import { useHub } from "@/components/HubProvider";
import MeetPanel from "@/components/MeetPanel";
import ScreenPanel, { LinkBox, type CinemaState, type ClassState } from "@/components/ScreenPanel";
import { npcById } from "@/lib/world/npcs";
import { MENUS, drinkById } from "@/lib/world/drinks";
import { LESSONS, parseVideoUrl } from "@/lib/world/screens";
import { cometPhase, type CometPhase } from "@/lib/world/comet";
import { ACH_REWARD, unlock, visitWorld } from "@/lib/world/achievements";
import { loadSolved } from "@/lib/world/codeLab";
import { grantTokens } from "@/lib/economy/economy";
import { listen, speak, speakSupported, speechSupported, stopSpeaking } from "@/lib/world/speech";
import { npcLocal } from "@/lib/world/novaKnowledge";
import { sceneFor } from "@/lib/world/scenes";
import { useToast } from "@/components/Toast";
import { Dot } from "@/components/app/Avatar";
import { cfgFromPub, getUid, load } from "@/lib/social/store";
import { cleanGear, type Loadout } from "@/lib/economy/catalog";
import { QUESTS } from "@/lib/social/quests";
import { play, setSound, soundOn } from "@/lib/sound";
import { TRACKS, musicVolume, setMusicVolume, startTrack, stopTrack } from "@/lib/world/music";
import { BURSTS, THEMES } from "@/lib/world/orb";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

type Panel = null | "worlds" | "chat" | "react" | "actions" | "people" | "menu" | "orb" | "nova";
type Poll = { q: string; votes: Record<string, number> };
const pollText = (p: Poll) => {
  const c = [0, 0, 0];
  Object.values(p.votes).forEach((v) => c[v]++);
  return `📊 ${p.q.slice(0, 70)} · 👍 ${c[0]} · 👎 ${c[1]} · 🤔 ${c[2]}`;
};
interface ChatMsg { mid: string; who: string; text: string; me?: boolean; tag?: string; reply?: { who: string; text: string }; reacts?: Record<string, string[]>; mention?: boolean }
interface Turn { r: "u" | "n"; t: string }
const CHAT_EMOJI = ["👍", "❤️", "😂", "😮", "🎉"];
const QUICK_EMOJI = ["😀", "😂", "🔥", "👏", "🎉", "❤️", "👍", "🤔"];
const rid = () => Math.random().toString(36).slice(2, 10);
const NOVA_CHIPS: Record<string, string[]> = {
  lounge: ["What can I do in the Lounge?", "How do I order a drink?"],
  meeting: ["How do I start a video meeting?", "Plan a 10-minute meeting agenda"],
  party: ["How do we watch a video together?", "How do I change the music?"],
  lab: ["Explain neural networks simply", "How does the AI class work?"],
  cosmos: ["What is there to do in Cosmos?", "Suggest a calm thing to do"],
};

type Api = {
  chat: (t: string, reply?: { who: string; text: string }) => void;
  reactMsg: (mid: string, e: string) => void;
  typing: () => void;
  emote: (e: string) => void;
  go: (id: string) => void;
  drop: (sid: string) => void;
  orb: (m: Record<string, unknown>) => void;
  goto: (id: string) => void;
  sitNearest: () => boolean;
  interact: () => void;
  topic: (t: string) => void;
  react: (e: string) => void;
  poll: (q: string) => void;
  vote: (c: number) => void;
  quality: (q: "high" | "low") => void;
  voiceStart: (h: string) => Promise<void>;
  voiceStop: () => void;
  voiceMute: (m: boolean) => void;
  drink: (d: string | null) => void;
  screen: (url: string | null) => void;
  klass: (l: number, s: number) => void;
  video: (kind: "interactive" | "hidden", on: boolean) => void;
  snapshot: () => Promise<Blob | null>;
  caption: (t: string) => void;
  hand: (up: boolean) => void;
  pin: (t: string | null, by?: string) => void;
};

const DOCK: { k: Exclude<Panel, null | "orb" | "nova">; icon: string; label: string }[] = [
  { k: "worlds", icon: "🌐", label: "Worlds" },
  { k: "chat", icon: "💬", label: "Chat" },
  { k: "react", icon: "😀", label: "React" },
  { k: "actions", icon: "✨", label: "Actions" },
  { k: "people", icon: "👥", label: "People" },
  { k: "menu", icon: "☰", label: "Menu" },
];

export default function WorldView() {
  const router = useRouter();
  const sp = useSearchParams();
  const hub = useHub();
  const toast = useToast();
  /** Shows a live caption line for a few seconds and keeps it for the transcript. */
  const showCap = (who: string, text: string) => {
    transcript.current = [...transcript.current.slice(-399), `${who}: ${text}`];
    const k = ++capKey.current;
    setCaps((c) => [...c.slice(-2), { k, who, text }]);
    window.setTimeout(() => setCaps((c) => c.filter((x) => x.k !== k)), 7000);
  };
  /** Unlocks an achievement once, with a small token reward. */
  const award = (id: string) => {
    const a = unlock(id);
    if (!a) return;
    grantTokens(ACH_REWARD);
    toast(`🏆 ${a.icon} ${a.title}: ${a.desc} (+${ACH_REWARD} tokens)`);
  };
  const hubRef = useRef(hub);
  hubRef.current = hub;
  const name = (sp.get("name") || hub.me?.name || "Guest").trim().slice(0, 20) || "Guest";
  const avId = AVS.some((a) => a.id === sp.get("av")) ? (sp.get("av") as string) : hub.me?.av || "atlas";
  const [room, setRoom] = useState<RoomId>(() => (isRoomId(sp.get("room")) ? (sp.get("room") as RoomId) : "lounge"));
  const fromRoom = useRef<RoomId | undefined>(undefined);
  const def = getRoom(room);
  const [entering, setEntering] = useState<RoomId | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const panelRef = useRef<Panel>(null);
  panelRef.current = panel;
  const [sel, setSel] = useState<string | null>(null);
  const [peerNames, setPeerNames] = useState<Record<string, string>>({});
  const [snd, setSnd] = useState(true);
  const [ctx, setCtx] = useState<WorldContext | null>(null);
  const [theme, setTheme] = useState("midnight");
  const [track, setTrack] = useState<string | null>(null);
  const [vol, setVol] = useState(0.55);
  const [hear, setHear] = useState(true);
  const [shout, setShout] = useState("");
  const [topic, setTopic] = useState("");
  const [unread, setUnread] = useState(0);
  const [ticker, setTicker] = useState<{ who: string; text: string } | null>(null);
  const [tip, setTip] = useState(true);
  const [huddle, setHuddle] = useState<{ id: string; name: string } | null>(null);
  const huddleRef = useRef<{ id: string; name: string } | null>(null);
  const [voice, setVoice] = useState<VoiceState>({ active: false, muted: false, peers: 0 });
  const [poll, setPoll] = useState<Poll | null>(null);
  const pollRef = useRef<Poll | null>(null);
  const [nova, setNova] = useState<{ busy: boolean; out: string | null }>({ busy: false, out: null });
  const [novaQ, setNovaQ] = useState("");
  const [pollIn, setPollIn] = useState("");
  const [gfx, setGfx] = useState<"high" | "low">("high");
  const [npc, setNpc] = useState<string | null>(null);
  const [npcLine, setNpcLine] = useState("");
  const [holding, setHolding] = useState<string | null>(null);
  const holdTimer = useRef(0);
  const [cinema, setCinema] = useState<CinemaState | null>(null);
  const cinemaRef = useRef<CinemaState | null>(null);
  const [klass, setKlass] = useState<ClassState | null>(null);
  const klassRef = useRef<ClassState | null>(null);
  useEffect(() => {
    try {
      setGfx(localStorage.getItem("barmo-gfx") === "low" ? "low" : "high");
    } catch {
      /* default */
    }
  }, []);
  const hearRef = useRef(true);
  const trackRef = useRef<string | null>(null);
  const themeRef = useRef("midnight");
  const topicRef = useRef("");
  const tickerTimer = useRef(0);
  useEffect(() => setVol(musicVolume()), []);
  useEffect(() => setSnd(soundOn()), []);
  useEffect(() => {
    const t = window.setTimeout(() => setTip(false), 12000);
    return () => window.clearTimeout(t);
  }, []);
  const myAcc = hub.me?.acc || "none";
  const myTop = hub.me?.top;
  const myLook = hub.me?.look;
  const lookKey = JSON.stringify(myLook || {});

  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Connecting…");
  const [people, setPeople] = useState<string[]>([]);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [replyTo, setReplyTo] = useState<{ who: string; text: string } | null>(null);
  const [typers, setTypers] = useState<Record<string, number>>({});
  const [trans, setTrans] = useState<Record<string, string>>({});
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const lastTyping = useRef(0);
  const uidRef = useRef("");
  const [novaThread, setNovaThread] = useState<Turn[]>([]);
  const novaLogRef = useRef<HTMLDivElement>(null);
  const [npcThread, setNpcThread] = useState<Turn[]>([]);
  const [npcQ, setNpcQ] = useState("");
  const [npcBusy, setNpcBusy] = useState(false);
  const [ccOn, setCcOn] = useState(false);
  const [ccHide, setCcHide] = useState(false);
  const [caps, setCaps] = useState<{ k: number; who: string; text: string }[]>([]);
  const transcript = useRef<string[]>([]);
  const capKey = useRef(0);
  const [dictating, setDictating] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  const readAloudRef = useRef(false);
  const [hands, setHands] = useState<Record<string, string>>({});
  const [iHand, setIHand] = useState(false);
  const [pin, setPin] = useState<{ who: string; text: string } | null>(null);
  const pinRef = useRef<{ who: string; text: string } | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [sugg, setSugg] = useState<{ mid: string; opts: string[]; busy: boolean } | null>(null);
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [repReason, setRepReason] = useState("");
  const [repNote, setRepNote] = useState("");
  const [flash, setFlash] = useState(false);
  const [vHide, setVHide] = useState(false);
  const [vCtl, setVCtl] = useState(false);
  const [comet, setComet] = useState<CometPhase | null>(null);
  const [text, setText] = useState("");
  const api = useRef<Api | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const [idea, setIdea] = useState("");
  const lastSent = useRef(0);

  const travel = (to: RoomId) => {
    if (to === room) {
      setPanel(null);
      return;
    }
    fromRoom.current = room;
    setEntering(to);
    setPanel(null);
    setSel(null);
    setRoom(to);
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("room", to);
      window.history.replaceState(null, "", u.toString());
    } catch {
      /* the URL is only a convenience */
    }
  };
  const travelRef = useRef(travel);
  travelRef.current = travel;

  useEffect(() => {
    if (!hostRef.current) return;
    const rd = getRoom(room);
    // fresh room: clear everything that belonged to the previous one
    setMsgs([]);
    setPeople([]);
    setPeerNames({});
    setCtx(null);
    setNpc(null);
    setHolding(null);
    setCinema(null);
    cinemaRef.current = null;
    setVHide(false);
    setVCtl(false);
    setHands({});
    setIHand(false);
    setPin(null);
    pinRef.current = null;
    setCaps([]);
    transcript.current = [];
    setKlass(null);
    klassRef.current = null;
    setHuddle(null);
    huddleRef.current = null;
    setUnread(0);
    setTicker(null);
    setTrack(null);
    trackRef.current = null;
    setTheme("midnight");
    themeRef.current = "midnight";
    topicRef.current = "";
    setPoll(null);
    pollRef.current = null;
    setVoice({ active: false, muted: false, peers: 0 });
    // One id PER TAB: the same person in two tabs/devices must still see each other.
    // The part before "~" is the stable account id used for friends, blocking and profiles.
    const uid = (getUid() || crypto.randomUUID()) + "~" + Math.random().toString(36).slice(2, 8);
    uidRef.current = uid;
    const greeted = new Set<string>();
    const capLast = new Map<string, number>();
    const spam = new Map<string, { t: number[]; last: string; rep: number }>();
    /** Many messages in a few seconds, or the same message again and again, counts as spam. */
    const isSpam = (id: string, text: string) => {
      const now = Date.now();
      const e = spam.get(id) || { t: [], last: "", rep: 0 };
      e.t = e.t.filter((x) => now - x < 5000);
      e.t.push(now);
      e.rep = text === e.last ? e.rep + 1 : 0;
      e.last = text;
      spam.set(id, e);
      return e.t.length >= 6 || e.rep >= 3;
    };
    const sidOf = (id: string) => id.split("~")[0];
    let moved = false;
    const vis = new Set<string>();
    const cfg: AvatarConfig = cfgFromPub({ av: avId, acc: myAcc, top: myTop, look: myLook });
    const metas = new Map<string, { name: string; cfg: AvatarConfig; gear?: Loadout; headline?: string }>();
    const last = new Map<string, RemotePeerState>();
    let channel: RealtimeChannel | null = null;
    let db: SupabaseClient | null = null;
    const doneTimer = window.setTimeout(() => setEntering(null), 900);
    if (room !== "lounge") hubRef.current.complete("world_" + room);

    let voiceCtl: VoiceCtl | null = null;
    const world = runWorld(hostRef.current, {
      full: true,
      onQuality: (q, auto) => {
        setGfx(q);
        if (auto) toast("Switched to Low graphics so it runs smoother. You can change this in the menu.");
      },
      room,
      spawn: spawnFor(room, fromRoom.current),
      myName: name,
      mySub: hubRef.current.me?.headline,
      myCfg: cfg,
      into: {
        send: (s) => {
          channel?.send({ type: "broadcast", event: "move", payload: { id: uid, s } });
          const h = hubRef.current;
          if (!moved && Math.hypot(s.x, s.z - 6) > 2.5) {
            moved = true;
            h.complete("walk");
            setTip(false);
          }
          rd.zones.forEach((z) => {
            if (!vis.has(z.id) && Math.min(Math.hypot(s.x - z.x, s.z - z.z), Math.hypot(s.x - z.sx, s.z - z.sz)) < 2.2) {
              vis.add(z.id);
              h.visitZone(room === "lounge" ? z.id : room + ":" + z.id);
            }
          });
        },
      },
      onPeerClick: (id) => setSel(id),
      onOrbClick: () => setPanel("orb"),
      onNpcClick: (id) => {
        const d = npcById(id);
        if (!d) return;
        setPanel(null);
        setNpc((cur) => {
          if (cur !== id) setNpcThread([]);
          return id;
        });
        setNpcLine(d.lines[Math.floor(Math.random() * d.lines.length)]);
      },
      onPortal: (to) => travelRef.current(to),
      onHuddle: (h) => {
        huddleRef.current = h;
        setHuddle(h);
        if (voiceCtl && voiceCtl.active() && voiceCtl.circle() !== (h ? h.id : null)) voiceCtl.stop();
        if (h) {
          hubRef.current.complete("huddle");
          setPanel((cur) => (cur === null ? "chat" : cur));
        }
      },
      onContext: (c) => {
        setCtx(c);
        if (c?.kind === "stand") hubRef.current.complete("sit");
        if (c?.kind === "talk" && c.npc && !greeted.has(c.npc)) {
          greeted.add(c.npc);
          const d = npcById(c.npc);
          if (d) push(d.name, d.lines[0]);
        }
      },
    });
    const refresh = () => {
      setPeople([...metas.values()].map((m) => m.name));
      setPeerNames(Object.fromEntries([...metas.entries()].map(([k, m]) => [k, m.name])));
    };
    const show = (id: string) => {
      const m = metas.get(id);
      if (m) world.applyPeerState(id, m.name, m.cfg, last.get(id) ?? { x: rd.spawn.x, z: rd.spawn.z, yaw: 0 }, m.gear, m.headline);
    };

    const toggleReact = (mid: string, e: string, by: string) =>
      setMsgs((ms) =>
        ms.map((m) => {
          if (m.mid !== mid) return m;
          const r = { ...(m.reacts || {}) };
          const cur = r[e] || [];
          const next = cur.includes(by) ? cur.filter((x) => x !== by) : [...cur, by].slice(0, 50);
          if (next.length) r[e] = next;
          else delete r[e];
          return { ...m, reacts: r };
        })
      );
    const push = (who: string, t: string, me = false, tag?: string, extra?: { mid?: string; reply?: { who: string; text: string } }) => {
      const first = name.trim().split(/\s+/)[0].toLowerCase();
      const mention = !me && ((first.length > 0 && t.toLowerCase().includes("@" + first)) || extra?.reply?.who === name);
      setMsgs((m) => [...m.slice(-49), { mid: extra?.mid || rid(), who, text: t, me, tag, reply: extra?.reply, mention }]);
      if (!me && readAloudRef.current) speak(`${who} says ${t}`);
      if (!me && panelRef.current !== "chat") {
        setUnread((u) => u + 1);
        setTicker({ who, text: mention ? "mentioned you: " + t : t });
        window.clearTimeout(tickerTimer.current);
        tickerTimer.current = window.setTimeout(() => setTicker(null), 5000);
      }
    };
    const lastOrb = new Map<string, number>();
    const applyOrb = (m: Record<string, unknown>, fromId: string | null) => {
      const self = fromId === null;
      const sid = fromId ? sidOf(fromId) : "";
      const h = hubRef.current;
      if (!self) {
        if (h.blocked.includes(sid)) return;
        const now = Date.now();
        if (now - (lastOrb.get(fromId!) || 0) < 500) return;
        lastOrb.set(fromId!, now);
      }
      const who = self ? name : metas.get(fromId!)?.name || "Someone";
      const muted = !self && h.muted.includes(sid);
      if (m.k === "music") {
        if (!self && (!hearRef.current || muted)) return;
        const id = typeof m.track === "string" && TRACKS.some((t) => t.id === m.track) ? (m.track as string) : null;
        if (id) startTrack(id); else stopTrack();
        trackRef.current = id;
        setTrack(id);
      } else if (m.k === "theme") {
        const id = typeof m.th === "string" && THEMES.some((t) => t.id === m.th) ? (m.th as string) : null;
        if (!id) return;
        world.setTheme(id);
        themeRef.current = id;
        setTheme(id);
      } else if (m.k === "fx") {
        if (m.v === "confetti" || m.v === "fireworks" || m.v === "bubbles") world.burst(m.v);
      } else if (m.k === "party") {
        world.emoteAll("dance");
      } else if (m.k === "poll") {
        if (muted || typeof m.q !== "string") return;
        const q = m.q.trim().slice(0, 70);
        if (!q) return;
        const np: Poll = { q, votes: {} };
        pollRef.current = np;
        setPoll(np);
        world.setBoard(pollText(np));
        push(who, "📊 Poll: " + q, self);
      } else if (m.k === "vote") {
        const cur = pollRef.current;
        if (!cur || muted || (m.c !== 0 && m.c !== 1 && m.c !== 2)) return;
        const np: Poll = { q: cur.q, votes: { ...cur.votes, [self ? "me" : fromId!]: m.c as number } };
        pollRef.current = np;
        setPoll(np);
        world.setBoard(pollText(np));
      } else if (m.k === "topic") {
        if (muted || typeof m.text !== "string") return;
        const t = m.text.trim().slice(0, 140);
        if (!t) return;
        world.setBoard(t);
        topicRef.current = t;
        if (!self) push(who, "📋 Topic: " + t);
      } else if (m.k === "drink") {
        const d = m.d === null ? null : drinkById(m.d);
        if (m.d !== null && !d) return;
        world.setDrink(fromId, d ? d.id : null);
      } else if (m.k === "hand") {
        if (muted) return;
        const hid = fromId ?? uid;
        const up = m.up === true;
        setHands((h) => {
          const n = { ...h };
          if (up) n[hid] = who;
          else delete n[hid];
          return n;
        });
        if (up && !self) {
          world.react(fromId, "✋");
          push(who, "✋ raised a hand");
        }
      } else if (m.k === "pin") {
        if (muted) return;
        if (m.text === null) {
          pinRef.current = null;
          setPin(null);
        } else if (typeof m.text === "string") {
          const t = m.text.replace(/\s+/g, " ").trim().slice(0, 160);
          if (!t) return;
          const p = { who: typeof m.who === "string" ? m.who.slice(0, 20) : who, text: t };
          pinRef.current = p;
          setPin(p);
          if (!self) push(who, "📌 pinned a message");
        }
      } else if (m.k === "screen") {
        if (muted) return;
        if (m.url === null) {
          cinemaRef.current = null;
          setCinema(null);
          world.setVideo(null);
          if (room === "party") world.setBoard("Cinema is idle. Sit down, paste a link and press play.");
          if (!self) push(who, "📺 stopped the big screen");
          return;
        }
        const v0 = parseVideoUrl(m.url);
        if (!v0 || typeof m.url !== "string") return;
        const since = typeof m.since === "number" && isFinite(m.since) && Math.abs(Date.now() - m.since) < 6 * 3600_000 ? m.since : Date.now();
        const c = { url: m.url.trim(), label: v0.label, by: who, since };
        cinemaRef.current = c;
        setCinema(c);
        const v = parseVideoUrl(c.url, (Date.now() - since) / 1000);
        world.setVideo(v);
        if (room === "party") world.setBoard(`NOW SHOWING: ${v0.label} (started by ${who})`);
        if (!self) push(who, "📺 put a video on the big screen");
      } else if (m.k === "class" && room === "lab") {
        const l = Number(m.l);
        const sl = Number(m.s);
        if (!Number.isInteger(l) || !Number.isInteger(sl) || l < 0 || l >= LESSONS.length || sl < 0 || sl >= LESSONS[l].slides.length) return;
        const kc = { l, s: sl, by: who };
        klassRef.current = kc;
        setKlass(kc);
        world.setBoard(`AI CLASS: ${LESSONS[l].title}. ${LESSONS[l].slides[sl].h} (slide ${sl + 1} of ${LESSONS[l].slides.length})`);
      } else if (m.k === "shout") {
        if (muted || typeof m.text !== "string") return;
        const t = m.text.trim().slice(0, 80);
        if (!t) return;
        world.shout(who, t);
        push(who, "📣 " + t, self);
      }
    };
    api.current = {
      orb: (m) => {
        if (m.k === "music" && m.track) award("dj");
        applyOrb(m, null);
        channel?.send({ type: "broadcast", event: "orb", payload: { id: uid, ...m } });
        hubRef.current.complete("orb");
      },
      drink: (d) => {
        const msg = { k: "drink", d };
        applyOrb(msg, null);
        channel?.send({ type: "broadcast", event: "orb", payload: { id: uid, ...msg } });
      },
      screen: (url) => {
        if (url) award("cinema");
        const msg = { k: "screen", url, since: Date.now() };
        applyOrb(msg, null);
        channel?.send({ type: "broadcast", event: "orb", payload: { id: uid, ...msg } });
      },
      caption: (t) => {
        channel?.send({ type: "broadcast", event: "chatx", payload: { id: uid, k: "caption", text: t.slice(0, 160) } });
      },
      hand: (up) => {
        const msg = { k: "hand", up };
        applyOrb(msg, null);
        channel?.send({ type: "broadcast", event: "orb", payload: { id: uid, ...msg } });
      },
      pin: (t, by) => {
        const msg = { k: "pin", text: t, who: by || name };
        applyOrb(msg, null);
        channel?.send({ type: "broadcast", event: "orb", payload: { id: uid, ...msg } });
      },
      video: (kind, on) => {
        if (kind === "interactive") world.setVideoInteractive(on);
        else {
          world.setVideoHidden(on);
          const c = cinemaRef.current;
          if (!on && c) world.setVideo(parseVideoUrl(c.url, (Date.now() - c.since) / 1000));
        }
      },
      klass: (l, s2) => {
        const msg = { k: "class", l, s: s2 };
        applyOrb(msg, null);
        channel?.send({ type: "broadcast", event: "orb", payload: { id: uid, ...msg } });
      },
      topic: (t) => {
        const v = t.trim().slice(0, 140);
        if (!v) return;
        world.setBoard(v);
        topicRef.current = v;
        push(name, "📋 Topic: " + v, true);
        channel?.send({ type: "broadcast", event: "orb", payload: { id: uid, k: "topic", text: v } });
        hubRef.current.complete("topic");
        if (room === "lab") hubRef.current.complete("idea");
      },
      goto: (id) => {
        const s = last.get(id);
        if (s) world.teleport(s.x + 1, s.z + 1);
      },
      chat: (t, reply) => {
        const hd = huddleRef.current;
        const mid = rid();
        world.say(null, t);
        push(name, t, true, hd?.name, { mid, reply });
        channel?.send({ type: "broadcast", event: "chat", payload: { id: uid, text: t, h: hd?.id, mid, rt: reply ? { who: reply.who.slice(0, 20), text: reply.text.slice(0, 80) } : undefined } });
      },
      reactMsg: (mid, e) => {
        if (!CHAT_EMOJI.includes(e)) return;
        toggleReact(mid, e, uid);
        channel?.send({ type: "broadcast", event: "chatx", payload: { id: uid, k: "react", mid, e } });
      },
      typing: () => {
        channel?.send({ type: "broadcast", event: "chatx", payload: { id: uid, k: "typing" } });
      },
      drop: (sid) => {
        [...metas.keys()].filter((k) => sidOf(k) === sid).forEach((k) => {
          metas.delete(k);
          last.delete(k);
          world.removePeer(k);
        });
        refresh();
      },
      go: (id) => {
        const z = rd.zones.find((q) => q.id === id);
        if (z) world.teleport(z.sx, z.sz);
      },
      emote: (e) => {
        world.emote(null, e);
        if (e === "dance" || e === "wave") hubRef.current.complete(e);
        play("wave");
        channel?.send({ type: "broadcast", event: "emote", payload: { id: uid, e } });
      },
      sitNearest: () => world.sitNearest(),
      interact: () => world.interact(),
      react: (e) => {
        world.react(null, e);
        channel?.send({ type: "broadcast", event: "emote", payload: { id: uid, e: "r:" + e } });
      },
      poll: (q) => {
        const v = q.trim().slice(0, 70);
        if (v) api.current?.orb({ k: "poll", q: v });
      },
      vote: (c) => api.current?.orb({ k: "vote", c }),
      quality: (q) => world.setQuality(q),
      snapshot: () => world.snapshot(),
      voiceStart: async (h) => {
        if (!voiceCtl) return;
        await voiceCtl.start(h);
      },
      voiceStop: () => voiceCtl?.stop(),
      voiceMute: (m) => voiceCtl?.setMuted(m),
    };
    const mesh = createVoice({
      myId: uid,
      send: (sig) => channel?.send({ type: "broadcast", event: "rtc", payload: { id: uid, ...sig } }),
      onChange: (st) => setVoice(st),
      onSpeaking: (id, on) => world.setSpeaking(id, on),
      isBlocked: (id) => hubRef.current.blocked.includes(sidOf(id)),
      isMuted: (id) => hubRef.current.muted.includes(sidOf(id)),
    });
    // LiveKit when the server has keys; otherwise direct browser-to-browser voice.
    const lk = createLiveKitVoice({
      myId: uid,
      roomId: room,
      name,
      onChange: (st) => setVoice(st),
      onSpeaking: (id, on) => world.setSpeaking(id, on),
      isBlocked: (id) => hubRef.current.blocked.includes(sidOf(id)),
      isMuted: (id) => hubRef.current.muted.includes(sidOf(id)),
    });
    voiceCtl = {
      active: () => lk.active() || mesh.active(),
      circle: () => lk.circle() ?? mesh.circle(),
      start: async (h) => {
        try {
          await lk.start(h);
        } catch (e) {
          if (e instanceof LiveKitUnavailable) await mesh.start(h);
          else throw e;
        }
      },
      stop: () => {
        lk.stop();
        mesh.stop();
      },
      setMuted: (m) => {
        lk.setMuted(m);
        mesh.setMuted(m);
      },
      handle: (id, sig) => mesh.handle(id, sig),
      drop: (id) => mesh.drop(id),
    };

    try {
      db = supabaseBrowser();
      channel = connectPresence(db, room, uid, { name, cfg, headline: hubRef.current.me?.headline, gear: cleanGear(load("loadout", {})) }, {
        onMeta: (id, m) => {
          if (id === uid || hubRef.current.blocked.includes(sidOf(id))) return;
          if (!metas.has(id)) {
            // bring a newcomer in sync with the room's music, lights and screen
            setTimeout(() => {
              if (trackRef.current) channel?.send({ type: "broadcast", event: "orb", payload: { id: uid, k: "music", track: trackRef.current } });
              if (themeRef.current !== "midnight") channel?.send({ type: "broadcast", event: "orb", payload: { id: uid, k: "theme", th: themeRef.current } });
              if (topicRef.current) channel?.send({ type: "broadcast", event: "orb", payload: { id: uid, k: "topic", text: topicRef.current } });
              if (pinRef.current) channel?.send({ type: "broadcast", event: "orb", payload: { id: uid, k: "pin", text: pinRef.current.text, who: pinRef.current.who } });
              if (cinemaRef.current) channel?.send({ type: "broadcast", event: "orb", payload: { id: uid, k: "screen", url: cinemaRef.current.url, since: cinemaRef.current.since } });
              if (klassRef.current) channel?.send({ type: "broadcast", event: "orb", payload: { id: uid, k: "class", l: klassRef.current.l, s: klassRef.current.s } });
            }, 2000);
          }
          metas.set(id, m);
          show(id);
          refresh();
        },
        onLeave: (id) => {
          voiceCtl?.drop(id);
          metas.delete(id);
          last.delete(id);
          world.removePeer(id);
          refresh();
        },
        onMove: (id, s) => {
          if (id === uid || hubRef.current.blocked.includes(sidOf(id))) return;
          last.set(id, s);
          show(id);
        },
        onChatX: (id, m) => {
          if (id === uid || !metas.has(id)) return;
          if (hubRef.current.muted.includes(sidOf(id)) || hubRef.current.blocked.includes(sidOf(id))) return;
          if (m.k === "react" && m.mid && m.e && CHAT_EMOJI.includes(m.e)) toggleReact(m.mid, m.e, id);
          else if (m.k === "typing") setTypers((t) => ({ ...t, [id]: Date.now() }));
          else if (m.k === "caption" && m.text) {
            const now = Date.now();
            if (now - (capLast.get(id) || 0) < 350) return;
            capLast.set(id, now);
            showCap(metas.get(id)!.name, m.text);
          }
        },
        onChat: (id, t, hid, x) => {
          if (id === uid || !metas.has(id)) return;
          // Private circle talk is only for people standing in that same circle.
          if (hid && huddleRef.current?.id !== hid) return;
          if (hubRef.current.muted.includes(sidOf(id)) || hubRef.current.blocked.includes(sidOf(id))) return;
          if (isSpam(id, t)) {
            hubRef.current.mute(sidOf(id));
            toast(`Muted ${metas.get(id)?.name || "someone"} for spamming. You can unmute them in Profile.`);
            return;
          }
          world.say(id, t);
          play("pop");
          push(metas.get(id)!.name, t, false, hid ? huddleRef.current?.name : undefined, { mid: x?.mid, reply: x?.rt });
          setTypers((tp) => {
            const { [id]: _gone, ...rest } = tp;
            void _gone;
            return rest;
          });
        },
        onOrb: (id, m) => {
          if (id === uid || !metas.has(id)) return;
          applyOrb(m, id);
        },
        onEmote: (id, e) => {
          if (id === uid || !metas.has(id)) return;
          if (e.startsWith("r:")) {
            if (!hubRef.current.muted.includes(sidOf(id))) world.react(id, e.slice(2));
          } else world.emote(id, e);
        },
        onRtc: (id, sig) => {
          if (metas.has(id)) void voiceCtl?.handle(id, sig);
        },
        onStatus: (ok, err) => setStatus(ok ? "Live" : err || "Disconnected"),
      });
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Supabase configuration error.");
    }

    return () => {
      window.clearTimeout(doneTimer);
      window.clearTimeout(tickerTimer.current);
      voiceCtl?.stop();
      stopTrack();
      if (channel && db) void leavePresence(db, channel);
      world.destroy();
    };
  }, [room, name, avId, myAcc, myTop, lookKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Arriving with ?name=&av= and no saved profile: create one so friends/requests work.
  useEffect(() => {
    if (hub.ready && !hub.me && sp.get("name")) hub.saveProfile({ name, av: avId });
  }, [hub.ready, hub.me]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    logRef.current?.scrollTo(0, logRef.current.scrollHeight);
  }, [msgs, panel]);
  useEffect(() => {
    if (panel === "chat") {
      setUnread(0);
      setTicker(null);
      const i = window.setInterval(() => setTypers((t) => (Object.keys(t).some((k) => Date.now() - t[k] > 3500) ? Object.fromEntries((Object.entries(t) as [string, number][]).filter(([, v]) => Date.now() - v <= 3500)) : t)), 1000);
      return () => window.clearInterval(i);
    }
  }, [panel]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("barmo-nova-thread");
      if (raw) {
        const a = JSON.parse(raw) as Turn[];
        if (Array.isArray(a)) setNovaThread(a.filter((x) => x && (x.r === "u" || x.r === "n") && typeof x.t === "string").slice(-24));
      }
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    if (!ccOn) return;
    return listen({
      keepAlive: true,
      onText: (t, final) => {
        if (!final) return;
        api.current?.caption(t);
        showCap(name, t);
      },
      onError: (m) => {
        toast(m);
        setCcOn(false);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ccOn]);
  useEffect(() => {
    if (!dictating) return;
    return listen({
      onText: (t, final) => {
        if (final) setText((x) => (x + " " + t).trim().slice(0, 200));
      },
      onEnd: () => setDictating(false),
      onError: (m) => {
        toast(m);
        setDictating(false);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictating]);
  useEffect(() => {
    try {
      const on = localStorage.getItem("barmo-tts") === "1";
      setReadAloud(on);
      readAloudRef.current = on;
    } catch {
      /* ignore */
    }
    return () => stopSpeaking();
  }, []);
  useEffect(() => {
    // visiting all five worlds unlocks Explorer
    const a = visitWorld(room);
    if (a) {
      grantTokens(ACH_REWARD);
      toast(`🏆 ${a.icon} ${a.title}: ${a.desc} (+${ACH_REWARD} tokens)`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);
  useEffect(() => {
    if (room !== "cosmos") {
      setComet(null);
      return;
    }
    let was = -1;
    const tick = () => {
      const c = cometPhase(Date.now());
      setComet(c);
      if (c.k >= 0 && was < 0) toast("☄️ A comet is crossing the sky. Make a wish!");
      was = c.k;
    };
    tick();
    const i = window.setInterval(tick, 1000);
    return () => window.clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);
  useEffect(() => {
    try {
      localStorage.setItem("barmo-nova-thread", JSON.stringify(novaThread.slice(-24)));
    } catch {
      /* ignore */
    }
    novaLogRef.current?.scrollTo(0, novaLogRef.current.scrollHeight);
  }, [novaThread, panel]);

  const submit = () => {
    const t = text.trim().slice(0, 200);
    if (!t || Date.now() - lastSent.current < 700) return;
    lastSent.current = Date.now();
    setText("");
    setEmojiOpen(false);
    if (t === "/roll") return roll();
    if (t.startsWith("/me ")) return void api.current?.chat(`* ${name} ${t.slice(4).trim()}`);
    if (t.startsWith("/nova ")) return void slashNova(t.slice(6).trim());
    api.current?.chat(t, replyTo || undefined);
    setReplyTo(null);
    hub.complete("chat");
    award("first_chat");
  };
  const onType = (v: string) => {
    setText(v);
    if (v && Date.now() - lastTyping.current > 2000) {
      lastTyping.current = Date.now();
      api.current?.typing();
    }
  };
  /** /nova question: Nova answers in the room so everyone sees it. */
  const slashNova = async (q: string) => {
    if (!q) return;
    toast("Asking Nova…");
    let out = "";
    try {
      const r = await fetch("/api/nova", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task: "chat", text: q, where: def.name }) });
      const j = (await r.json()) as { text?: string };
      out = (j.text || "").replace(/\s+/g, " ").slice(0, 190);
    } catch {
      /* fall through */
    }
    api.current?.chat("🤖 Nova: " + (out || "I could not answer that right now."));
  };
  const translateMsg = async (m: ChatMsg) => {
    if (trans[m.mid]) {
      setTrans((t) => {
        const { [m.mid]: _x, ...rest } = t;
        void _x;
        return rest;
      });
      return;
    }
    setTrans((t) => ({ ...t, [m.mid]: "Translating…" }));
    let out = "Could not translate right now.";
    try {
      const r = await fetch("/api/nova", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task: "translate", text: m.text, lang: navigator.language || "English" }) });
      const j = (await r.json()) as { text?: string; source?: string };
      if (j.text) out = j.text;
    } catch {
      /* keep default */
    }
    setTrans((t) => ({ ...t, [m.mid]: out }));
  };
  const saveChat = () => {
    if (!msgs.length) return toast("Nothing to save yet");
    const body = `BARMO chat · ${def.name} · ${new Date().toLocaleString()}\n\n` + msgs.map((m) => `${m.who}: ${m.text}`).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
    a.download = "barmo-chat.txt";
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const suggestReply = async (m: ChatMsg) => {
    setSugg({ mid: m.mid, opts: [], busy: true });
    let opts: string[] = [];
    try {
      const r = await fetch("/api/nova", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task: "reply", text: m.text }) });
      const j = (await r.json()) as { text?: string };
      opts = (j.text || "").split("\n").map((x) => x.replace(/^[-*\d.\s]+/, "").trim()).filter(Boolean).slice(0, 3);
    } catch {
      /* fall back */
    }
    setSugg({ mid: m.mid, opts: opts.length ? opts : ["Thanks, got it!", "Can you tell me more?", "Sounds good 👍"], busy: false });
  };
  const downloadTranscript = () => {
    const lines = transcript.current.length ? transcript.current : msgs.map((m) => `${m.who}: ${m.text}`);
    if (!lines.length) return toast("Nothing to save yet");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([`BARMO transcript · ${def.name} · ${new Date().toLocaleString()}\n\n` + lines.join("\n")], { type: "text/plain" }));
    a.download = "barmo-transcript.txt";
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const meetingNotes = () => {
    const lines = transcript.current.length ? transcript.current : msgs.map((m) => `${m.who}: ${m.text}`);
    if (!lines.length) return toast("No captions or chat yet. Turn on captions or say something first.");
    askNova("summary", "", lines.slice(-30));
  };
  const toggleHand = () => {
    const up = !iHand;
    setIHand(up);
    api.current?.hand(up);
  };
  const takePhoto = async () => {
    const blob = await api.current?.snapshot();
    if (!blob) return toast("Could not take the photo. Try again.");
    setFlash(true);
    window.setTimeout(() => setFlash(false), 220);
    try {
      const bmp = await createImageBitmap(blob);
      const cv = document.createElement("canvas");
      cv.width = bmp.width;
      cv.height = bmp.height;
      const cx = cv.getContext("2d");
      if (!cx) throw new Error("no canvas");
      cx.drawImage(bmp, 0, 0);
      const pad = Math.round(bmp.width * 0.015);
      cx.font = `600 ${Math.max(14, Math.round(bmp.width * 0.022))}px system-ui, sans-serif`;
      cx.textAlign = "right";
      cx.fillStyle = "rgba(0,0,0,0.45)";
      cx.fillText(`BARMO · ${def.name}`, bmp.width - pad + 1, bmp.height - pad + 1);
      cx.fillStyle = "rgba(255,255,255,0.92)";
      cx.fillText(`BARMO · ${def.name}`, bmp.width - pad, bmp.height - pad);
      cv.toBlob((b) => {
        if (!b) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = `barmo-${room}-${Date.now()}.png`;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      }, "image/png");
      award("photo");
      toast("📸 Photo saved");
    } catch {
      toast("Could not save the photo");
    }
  };
  const wish = () => {
    if (comet && comet.k >= 0) award("wish");
    api.current?.chat(comet && comet.k >= 0 ? `☄️✨ ${name} made a wish on the comet` : `✨ ${name} is waiting for the next comet`);
  };
  const talkNpc = async (preset?: string) => {
    const d = npc ? npcById(npc) : null;
    const q = (preset ?? npcQ).trim();
    if (!d || !q || npcBusy) return;
    const hist = npcThread.slice(-6);
    if (preset === undefined) setNpcQ("");
    setNpcThread((h) => [...h, { r: "u", t: q }]);
    setNpcBusy(true);
    let out = "";
    try {
      const r = await fetch("/api/nova", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task: "npc", npc: d.id, text: q, history: hist }) });
      const j = (await r.json()) as { text?: string };
      out = j.text || "";
    } catch {
      /* fall back below */
    }
    setNpcThread((h) => [...h, { r: "n", t: out || npcLocal(d.id, q) }]);
    setNpcBusy(false);
  };

  const act = (t: string) => api.current?.chat(t);
  const roll = () => {
    hub.complete("dice");
    act(`🎲 ${name} rolled a ${1 + Math.floor(Math.random() * 6)}`);
  };
  const postIdea = () => {
    const t = idea.trim().slice(0, 120);
    if (!t) return;
    if (room === "lab" || room === "meeting") {
      api.current?.topic(t);
    } else {
      hub.complete("idea");
      act(`💡 Idea: ${t}`);
    }
    setIdea("");
  };
  const toggle = (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p));
  const findSeat = () => {
    if (!api.current?.sitNearest()) toast("All seats here are taken right now");
    else setPanel(null);
  };
  const toggleSound = () => {
    const v = !snd;
    setSnd(v);
    setSound(v);
    if (!v) {
      stopTrack();
      setTrack(null);
      trackRef.current = null;
    }
  };

  const startVoice = async () => {
    if (!huddle) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast("Voice needs a secure (https) page and a microphone");
      return;
    }
    try {
      await api.current?.voiceStart(huddle.id);
      toast("Voice on. Others in this circle can hear you.");
    } catch {
      toast("Microphone blocked or missing. Allow it in your browser, then try again.");
    }
  };
  const askNova = async (task: "icebreaker" | "summary" | "improve" | "ask", text = "", lines: string[] = []) => {
    setPanel("nova");
    const label = task === "summary" ? "Summarize our chat" : task === "icebreaker" ? "Give me an icebreaker" : task === "improve" ? "Improve my idea: " + text : text;
    const hist = novaThread.slice(-8);
    setNovaThread((h) => [...h, { r: "u" as const, t: label.slice(0, 400) }].slice(-24));
    setNova({ busy: true, out: null });
    let out = "";
    try {
      const r = await fetch("/api/nova", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: task === "ask" ? "chat" : task, text, lines, history: task === "ask" ? hist : undefined, where: def.name }),
      });
      const j = (await r.json()) as { text?: string; error?: string };
      out = j.text || j.error || "Nova is quiet right now. Try again.";
    } catch {
      out = "Could not reach Nova. Check your connection and try again.";
    }
    setNovaThread((h) => [...h, { r: "n" as const, t: out }].slice(-24));
    setNova({ busy: false, out });
  };
  const novaIcebreaker = () => {
    const mineTags = [...(hub.me?.interests || []), ...(hub.me?.openTo || [])];
    const others = Object.keys(peerNames).flatMap((id) => hub.online[id.split("~")[0]]?.interests || []);
    askNova("icebreaker", [...mineTags, ...others].slice(0, 12).join(", "));
  };
  const toggleGfx = () => {
    const q = gfx === "high" ? "low" : "high";
    setGfx(q);
    try {
      localStorage.setItem("barmo-gfx", q);
    } catch {
      /* ignore */
    }
    api.current?.quality(q);
  };
  const tally = [0, 0, 0];
  if (poll) Object.values(poll.votes).forEach((v) => tally[v]++);

  // People here, with what you have in common (interests and what you are open to).
  const mine = new Set([...(hub.me?.interests || []), ...(hub.me?.openTo || [])].map((x) => x.toLowerCase()));
  const peopleHere = Object.entries(peerNames)
    .map(([id, n]) => {
      const o = hub.online[id.split("~")[0]];
      const why = o ? [...new Set([...o.interests, ...(o.openTo || [])].filter((x) => mine.has(x.toLowerCase())))] : [];
      return { id, n, why, r: Math.random() };
    })
    .sort((a, b) => b.why.length - a.why.length || a.r - b.r);
  const connect = () => {
    const best = peopleHere[0];
    if (!best) {
      toast("Nobody else is here yet. Try another world from 🌐 Worlds.");
      return;
    }
    api.current?.goto(best.id);
    act(`👋 ${name} wants to connect with ${best.n}` + (best.why.length ? ` · you both like ${best.why.slice(0, 2).join(" & ")}` : ""));
    setPanel(null);
  };

  const live = status === "Live";
  const hasSeats = def.seats.length > 0;
  const bell = hub.unreadNotices + hub.unreadDMs;
  return (
    <div className="stage full" ref={hostRef} style={{ position: "relative", height: "100dvh" }}>
      <button className="rchip" onClick={() => toggle("worlds")} aria-label="Change world">
        <span className="ri">{def.icon}</span>
        <span className="rt"><b>{def.name}</b><small><i className={live ? "dot ok" : "dot"} />{live ? "Live" : status} · {people.length + 1} here</small></span>
      </button>
      <div className="topr">
        <button className="btn g" onClick={() => router.push("/alerts")} aria-label="Notifications">
          🔔{bell > 0 && <b className="badge static">{bell}</b>}
        </button>
      </div>

      {huddle && (
        <div className="huddlebar" role="status">
          <div>🔒 <b>{huddle.name}</b> · private circle. Only people standing in it see your messages{voice.active ? ` · 🎧 ${voice.peers + 1} on voice` : ""}.</div>
          <div className="hb">
            {!voice.active ? (
              <button className="btn sm" onClick={startVoice}>🎙️ Join voice</button>
            ) : (
              <>
                <button className="btn sm" onClick={() => api.current?.voiceMute(!voice.muted)}>{voice.muted ? "🔇 Unmute" : "🎙️ Mute"}</button>
                <button className="btn g sm" onClick={() => api.current?.voiceStop()}>Leave voice</button>
              </>
            )}
            <button className="btn g sm" onClick={novaIcebreaker}>🤖 Icebreaker</button>
          </div>
        </div>
      )}
      {tip && !panel && !huddle && <div className="tip">Tap the floor to walk · drag to look around · tap a chair to sit</div>}
      {room === "party" && !track && !panel && !huddle && !tip && (
        <button className="partyhint" onClick={() => setPanel("orb")}>🎧 Pick a song · the whole room changes with the music</button>
      )}
      {track && (
        <button className="nowplaying" onClick={() => setPanel("orb")} aria-label="Open the music controls">
          <span className="eq" aria-hidden="true"><i /><i /><i /><i /></span>
          <span className="np-t"><b>{TRACKS.find((t) => t.id === track)?.name || "Music"}</b><small>{sceneFor(track)?.vibe || "Now playing"}</small></span>
        </button>
      )}
      {flash && <div className="photoflash" aria-hidden="true" />}
      {(pin || Object.keys(hands).length > 0) && (
        <div className="lstack">
          {pin && (
            <div className="pinbar" role="status">
              <span className="cb-t">📌 <b>{pin.who}</b>: {pin.text}</span>
              <button onClick={() => api.current?.pin(null)} aria-label="Unpin">✕</button>
            </div>
          )}
          {(() => {
            const up = Object.entries(hands).filter(([id]) => id === uidRef.current || peerNames[id]).map(([, n]) => n);
            return up.length ? <div className="handbar" role="status">✋ {up.join(", ")}</div> : null;
          })()}
        </div>
      )}
      {!ccHide && caps.length > 0 && (
        <div className="capbar" aria-live="polite">
          {caps.map((c) => <div key={c.k}><b>{c.who}:</b> {c.text}</div>)}
        </div>
      )}
      {cinema && (
        <div className="cinebar" role="group" aria-label="Big screen">
          <span className="cb-t">📺 <b>{cinema.label}</b> · {cinema.by}</span>
          <button className={vCtl ? "on" : ""} aria-pressed={vCtl} onClick={() => { api.current?.video("interactive", !vCtl); setVCtl(!vCtl); }}>🖱️ Controls</button>
          <button className={vHide ? "on" : ""} aria-pressed={vHide} onClick={() => { api.current?.video("hidden", !vHide); setVHide(!vHide); }}>{vHide ? "👁 Show" : "🙈 Hide"}</button>
          <button onClick={() => api.current?.screen(null)} aria-label="Stop the big screen for everyone">■</button>
        </div>
      )}
      {room === "party" && ctx?.kind === "stand" && ctx.seat?.startsWith("c") && (
        <ScreenPanel mode="cinema" cinema={cinema} klass={null} onPlay={(u) => api.current?.screen(u)} onSlide={() => {}} />
      )}
      {room === "lab" && ctx?.kind === "stand" && ctx.seat?.startsWith("d") && (
        <ScreenPanel mode="class" cinema={null} klass={klass} onPlay={() => {}} onSlide={(l, s2) => api.current?.klass(l, s2)} onSolved={(title) => { api.current?.chat(`💻 ${name} solved “${title}” in the Code lab 🎉`); award("coder"); if (loadSolved().length >= 3) award("coder3"); }} />
      )}
      {npc && !panel && (() => {
        const d = npcById(npc);
        if (!d) return null;
        const menu = d.menu ? MENUS[d.menu] : null;
        return (
          <div className="sheet npcsheet" role="dialog" aria-label={"Talk to " + d.name}>
            <div className="sh"><b>{d.name} <span className="nm">· {d.title}</span></b><button className="x2" onClick={() => setNpc(null)} aria-label="Close">×</button></div>
            <div className="nl">{npcLine}</div>
            {npcThread.slice(-4).map((m, i) => <div key={i} className={m.r === "u" ? "nb me" : "nb"}>{m.t}</div>)}
            {npcBusy && <div className="nb thinking">{d.name} is thinking…</div>}
            <div className="send">
              <input className="inp" maxLength={200} placeholder={"Say something to " + d.name + "…"} value={npcQ} onChange={(e) => setNpcQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void talkNpc()} />
              <button className="btn sm" disabled={!npcQ.trim() || npcBusy} onClick={() => void talkNpc()}>Say</button>
            </div>
            {menu && (
              <>
                <div className="lbl">Menu (all zero-alcohol){holding ? " · you are holding a " + (drinkById(holding)?.n || "drink").toLowerCase() : ""}</div>
                <div className="chips">
                  {menu.map((x) => (
                    <button key={x.id} className={"chip" + (holding === x.id ? " on" : "")} onClick={() => {
                      api.current?.drink(x.id);
                      award("first_drink");
                      setHolding(x.id);
                      setNpcLine(x.line);
                      window.clearTimeout(holdTimer.current);
                      holdTimer.current = window.setTimeout(() => setHolding(null), 120000);
                    }}>{x.icon} {x.n}</button>
                  ))}
                </div>
                {holding && <div className="acts"><button className="btn g sm" onClick={() => { api.current?.drink(null); setHolding(null); setNpcLine("No problem. I'll take that."); }}>Put the drink down</button></div>}
                <p className="hint">Drinks disappear on their own after two minutes.</p>
              </>
            )}
            {d.kind === "dancer" && (
              <div className="acts">
                <button className="btn sm" onClick={() => { api.current?.emote("dance"); setNpcLine(track ? "Let's go!" : "Put a song on at the DJ deck and I'll show you moves."); }}>💃 Dance together</button>
                <button className="btn g sm" onClick={() => { setNpc(null); setPanel("orb"); }}>🎧 Open the DJ deck</button>
              </div>
            )}
            {d.kind === "scientist" && (
              <div className="acts">
                <button className="btn sm" onClick={() => { api.current?.klass(0, 0); award("class"); setNpcLine("Class is starting. Sit at a workstation on the east side to follow along."); }}>🎓 Start an AI class</button>
                <button className="btn g sm" onClick={() => { setNpc(null); setPanel("nova"); }}>🤖 Ask Nova anything</button>
              </div>
            )}
            {d.kind === "tech" && (
              <div className="acts">
                <button className="btn g sm" onClick={() => setNpcLine("Sit at any workstation: the screens show a model training live, and you can join the class from there.")}>🖥️ What are those screens?</button>
                <button className="btn sm" onClick={() => setNpcLine("Sit at a workstation on the east side, then open the Code lab tab. Write real JavaScript, press Run, and the tests tell you if it works.")}>💻 Where do I code?</button>
              </div>
            )}
            {d.kind === "astronaut" && (
              <div className="acts">
                <button className="btn sm" disabled={npcBusy} onClick={() => void talkNpc("Tell me one surprising space fact.")}>🌠 Tell me a space fact</button>
                <button className="btn g sm" onClick={wish}>✨ Make a wish on the comet</button>
              </div>
            )}
            <div className="acts"><button className="btn g sm" onClick={() => setNpcLine(d.lines[Math.floor(Math.random() * d.lines.length)])}>💬 Chat</button></div>
          </div>
        );
      })()}
      {room === "meeting" && ctx?.kind === "stand" && (
        <MeetPanel name={name} blocked={hub.blocked} muted={hub.muted} onJoin={() => { api.current?.voiceStop(); award("meeting"); }} />
      )}
      {ticker && panel !== "chat" && (
        <button className="ticker" onClick={() => setPanel("chat")}><b>{ticker.who}</b> {ticker.text.slice(0, 80)}</button>
      )}

      {ctx && !panel && (
        <button className="btn ctxbtn" onClick={() => api.current?.interact()}>
          {ctx.kind === "sit" ? "🪑" : ctx.kind === "stand" ? "🚶" : ctx.kind === "talk" ? "💬" : "🔮"} {ctx.label}
        </button>
      )}

      {panel === "react" && (
        <div className="reactbar" role="group" aria-label="Reactions">
          {REACTIONS.map((e) => <button key={e} onClick={() => api.current?.react(e)} aria-label={"React " + e}>{e}</button>)}
        </div>
      )}

      {panel === "nova" && (
        <div className="sheet novasheet" role="dialog" aria-label="Nova AI">
          <div className="sh"><b>🤖 Nova · your AI guide</b><span className="shbtns"><button className="x2" onClick={() => { setNovaThread([]); setNova({ busy: false, out: null }); }} aria-label="Clear the conversation" title="Clear conversation">🗑</button><button className="x2" onClick={() => setPanel(null)} aria-label="Close">×</button></span></div>
          <div className="log novalog" ref={novaLogRef}>
            {novaThread.length === 0 && <span className="hint">Hi, I'm Nova. Ask me how anything works here, get an icebreaker, or test an idea. I remember our conversation.</span>}
            {novaThread.map((m, i) => (
              <div key={i} className={m.r === "u" ? "nb me" : "nb"}>
                {m.t}
                {m.r === "n" && (
                  <span className="macts">
                    <button aria-label="Share to the room" title="Share to the room" onClick={() => { act("🤖 Nova: " + m.t.replace(/\s+/g, " ").slice(0, 180)); setPanel("chat"); }}>📣</button>
                    <button aria-label="Copy" title="Copy" onClick={async () => { try { await navigator.clipboard.writeText(m.t); toast("Copied"); } catch { toast("Could not copy"); } }}>⧉</button>
                  </span>
                )}
              </div>
            ))}
            {nova.busy && <div className="nb thinking">Nova is thinking…</div>}
          </div>
          <div className="chips">
            {(NOVA_CHIPS[room] || []).map((q) => <button key={q} className="chip" disabled={nova.busy} onClick={() => askNova("ask", q)}>{q}</button>)}
            <button className="chip" disabled={nova.busy} onClick={novaIcebreaker}>🧊 Icebreaker</button>
            <button className="chip" disabled={nova.busy} onClick={() => askNova("summary", "", msgs.slice(-30).map((m) => `${m.who}: ${m.text}`))}>📝 Summarize chat</button>
          </div>
          <div className="send">
            <input className="inp" maxLength={300} placeholder="Ask Nova anything…" value={novaQ} onChange={(e) => setNovaQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && novaQ.trim() && !nova.busy) { askNova("ask", novaQ); setNovaQ(""); } }} />
            <button className="btn sm" disabled={!novaQ.trim() || nova.busy} onClick={() => { askNova("ask", novaQ); setNovaQ(""); }}>Ask</button>
          </div>
          <button className="btn g sm" disabled={!novaQ.trim() || nova.busy} onClick={() => { askNova("improve", novaQ); setNovaQ(""); }}>💡 Improve my idea</button>
        </div>
      )}

      {panel === "worlds" && (
        <div className="sheet" role="dialog" aria-label="Worlds">
          <div className="sh"><b>🌐 Worlds</b><button className="x2" onClick={() => setPanel(null)} aria-label="Close">×</button></div>
          <div className="wgrid">
            {ROOMS.map((r) => (
              <button key={r.id} className={"wcard" + (r.id === room ? " here" : "")} style={{ ["--wc" as string]: "#" + r.color.toString(16).padStart(6, "0") }} onClick={() => travel(r.id)}>
                <span className="wi">{r.icon}</span>
                <span className="wt"><b>{r.name}</b><small>{r.tag}</small></span>
                <span className="wgo">{r.id === room ? "You are here" : "Enter"}</span>
              </button>
            ))}
          </div>
          <p className="hint">{def.blurb}</p>
        </div>
      )}

      {panel === "chat" && (
        <div className="sheet chatsheet" role="dialog" aria-label="Chat">
          <div className="sh"><b>💬 Chat · {def.name}</b><span className="shbtns">{speakSupported() && <button className="x2" onClick={() => { const v = !readAloud; setReadAloud(v); readAloudRef.current = v; try { localStorage.setItem("barmo-tts", v ? "1" : "0"); } catch { /* ignore */ } if (!v) stopSpeaking(); }} aria-pressed={readAloud} aria-label="Read new messages aloud" title="Read new messages aloud">{readAloud ? "🔊" : "🔈"}</button>}<button className="x2" onClick={saveChat} aria-label="Save chat as a text file" title="Save chat notes">⬇</button><button className="x2" onClick={() => setPanel(null)} aria-label="Close">×</button></span></div>
          <div className="log" ref={logRef}>
            {msgs.length === 0 && <span className="hint">Say hello 👋 · try /nova a question, /me waves, /roll, or @name</span>}
            {msgs.map((m) => (
              <div key={m.mid} className={(m.me ? "m me" : "m") + (m.mention ? " mention" : "")}>
                {m.reply && <div className="mq">↩ <b>{m.reply.who}</b> {m.reply.text}</div>}
                {m.tag && <i className="mtag">🔒 {m.tag}</i>}<b>{m.who}</b> {m.text}
                <span className="macts">
                  <button aria-label="Reply" title="Reply" onClick={() => setReplyTo({ who: m.who, text: m.text.slice(0, 80) })}>↩</button>
                  {!m.me && <button aria-label="Translate" title="Translate" onClick={() => void translateMsg(m)}>🌐</button>}
                  <button aria-label="React" title="React" onClick={() => setPickFor(pickFor === m.mid ? null : m.mid)}>☺</button>
                  <button aria-label="Pin to the room" title="Pin to the room" onClick={() => api.current?.pin(m.text, m.who)}>📌</button>
                  {!m.me && <button aria-label="Suggest replies" title="Suggest replies with AI" onClick={() => void suggestReply(m)}>✨</button>}
                </span>
                {pickFor === m.mid && (
                  <div className="rxpick">{CHAT_EMOJI.map((e) => <button key={e} onClick={() => { api.current?.reactMsg(m.mid, e); setPickFor(null); }}>{e}</button>)}</div>
                )}
                {m.reacts && (
                  <div className="rxrow">
                    {(Object.entries(m.reacts) as [string, string[]][]).map(([e, ids]) => (
                      <button key={e} className={"rx" + (ids.includes(uidRef.current) ? " on" : "")} onClick={() => api.current?.reactMsg(m.mid, e)}>{e} {ids.length}</button>
                    ))}
                  </div>
                )}
                {trans[m.mid] && <div className="mtr">🌐 {trans[m.mid]}</div>}
              </div>
            ))}
          </div>
          {(() => {
            const who = Object.keys(typers).filter((k) => Date.now() - typers[k] < 3500).map((k) => peerNames[k]).filter(Boolean);
            return who.length ? <div className="typing">{who.slice(0, 2).join(" and ")} {who.length > 2 ? "and others " : ""}{who.length === 1 ? "is" : "are"} typing…</div> : null;
          })()}
          {replyTo && <div className="replychip">↩ Replying to <b>{replyTo.who}</b>: {replyTo.text}<button onClick={() => setReplyTo(null)} aria-label="Cancel reply">×</button></div>}
          {sugg && (
            <div className="rxpick quick" aria-live="polite">
              {sugg.busy ? <span className="hint">Thinking of replies…</span> : sugg.opts.map((o) => <button key={o} onClick={() => { setText(o.slice(0, 200)); setSugg(null); }}>{o}</button>)}
            </div>
          )}
          {qrOpen && (
            <div className="rxpick quick">
              {["👋 Hi everyone!", "Thanks!", "Can you say that again?", "I'll be right back", "Sounds good 👍", "Can you share the link?"].map((q) => <button key={q} onClick={() => { api.current?.chat(q); award("first_chat"); }}>{q}</button>)}
            </div>
          )}
          {emojiOpen && <div className="rxpick quick">{QUICK_EMOJI.map((e) => <button key={e} onClick={() => setText((t) => (t + e).slice(0, 200))}>{e}</button>)}</div>}
          <div className="send">
            <button className="btn g sm" onClick={() => setEmojiOpen(!emojiOpen)} aria-label="Emoji">😊</button>
            <button className="btn g sm" onClick={() => setQrOpen(!qrOpen)} aria-label="Quick replies" title="Quick replies">⚡</button>
            {speechSupported() && <button className={"btn sm" + (dictating ? "" : " g")} onClick={() => setDictating(!dictating)} aria-pressed={dictating} aria-label="Dictate a message with your voice" title="Dictate with your voice">{dictating ? "🔴" : "🎙"}</button>}
            <input className="inp" maxLength={200} placeholder="Type a message…" value={text}
              onChange={(e) => onType(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
            <button className="btn" onClick={submit}>Send</button>
          </div>
        </div>
      )}

      {panel === "actions" && (
        <div className="sheet" role="dialog" aria-label="Actions">
          <div className="sh"><b>✨ Actions</b><button className="x2" onClick={() => setPanel(null)} aria-label="Close">×</button></div>
          <button className="novacard" onClick={() => setPanel("nova")}><span>🤖</span><span><b>Ask Nova</b><small>Icebreakers, chat summaries and idea feedback</small></span></button>
          <div className="lbl">💬 Talk and listen</div>
          <div className="acts">
            <button className={"btn" + (iHand ? "" : " g")} aria-pressed={iHand} onClick={toggleHand}>{iHand ? "✋ Lower hand" : "✋ Raise hand"}</button>
            {speechSupported() ? (
              <button className={"btn" + (ccOn ? "" : " g")} aria-pressed={ccOn} onClick={() => setCcOn(!ccOn)}>{ccOn ? "■ Stop my captions" : "💬 Share my live captions"}</button>
            ) : (
              <span className="hint">Live captions need Chrome or Edge.</span>
            )}
          </div>
          <div className="acts">
            <button className="btn g sm" onClick={() => setCcHide(!ccHide)}>{ccHide ? "Show captions" : "Hide captions"}</button>
            <button className="btn g sm" onClick={downloadTranscript}>⬇ Transcript</button>
            <button className="btn g sm" onClick={meetingNotes}>📝 AI meeting notes</button>
          </div>
          <p className="hint">Captions turn what you say into text for everyone in this world. Your browser&apos;s speech service processes the audio. They are off until you switch them on.</p>
          <div className="lbl">📺 Big screen (everyone in this world sees it)</div>
          <LinkBox cinema={cinema} onPlay={(u) => api.current?.screen(u)} />
          {room === "cosmos" && (
            <>
              <div className="lbl">☄️ Comet watch</div>
              <div className="cometbox">
                <span>{comet && comet.k >= 0 ? "A comet is crossing the sky right now!" : `Next comet in ${comet ? comet.inSec : "…"} s`}</span>
                <button className="btn sm" onClick={wish}>✨ Make a wish</button>
              </div>
            </>
          )}
          <div className="acts"><button className="btn g" onClick={() => { setPanel(null); window.setTimeout(() => void takePhoto(), 250); }}>📸 Take a photo</button></div>
          <div className="lbl">Express yourself</div>
          <div className="emogrid">
            <button className="btn g" onClick={() => api.current?.emote("wave")}>👋 Wave</button>
            <button className="btn g" onClick={() => api.current?.emote("dance")}>💃 Dance</button>
            <button className="btn g" onClick={() => api.current?.emote("clap")}>👏 Clap</button>
            <button className="btn g" onClick={() => api.current?.emote("jump")}>🤾 Jump</button>
            <button className="btn g" onClick={() => { api.current?.emote("hand"); act(`✋ ${name} raised a hand`); }}>✋ Raise hand</button>
          </div>
          {hasSeats && (
            <>
              <div className="lbl">Seating</div>
              <div className="acts"><button className="btn g" onClick={findSeat}>🪑 Find me a seat</button></div>
              {room === "meeting" && <p className="hint">🎥 Sit at the table to start or join the video meeting. Stand up to leave it.</p>}
              {room === "party" && <p className="hint">🎬 Sit in the cinema seats on the west side, paste a video link and watch together.</p>}
              {room === "lab" && <p className="hint">🎓 Sit at a workstation to join the AI class, write real code in the Code lab, and ask Nova questions.</p>}
            </>
          )}
          {(room === "meeting" || room === "lab") && (
            <>
              <div className="lbl">{room === "meeting" ? "Meeting topic (shown on the screens)" : "Post to the prompt wall"}</div>
              <div className="send">
                <input className="inp" maxLength={140} placeholder={room === "meeting" ? "e.g. Q4 launch plan" : "e.g. An AI that explains code"} value={idea}
                  onChange={(e) => setIdea(e.target.value)} onKeyDown={(e) => e.key === "Enter" && postIdea()} />
                <button className="btn" onClick={postIdea}>{room === "meeting" ? "Set topic" : "Post"}</button>
              </div>
            </>
          )}
          <div className="lbl">📊 Quick poll</div>
          {poll ? (
            <>
              <div className="pollq">{poll.q}</div>
              <div className="votes">
                {["👍", "👎", "🤔"].map((e, i) => (
                  <button key={e} className={"vote" + (poll.votes.me === i ? " on" : "")} onClick={() => api.current?.vote(i)}>
                    <span>{e} {tally[i]}</span>
                    <i style={{ width: (Object.keys(poll.votes).length ? (tally[i] / Object.keys(poll.votes).length) * 100 : 0) + "%" }} />
                  </button>
                ))}
              </div>
              <div className="acts"><button className="btn g sm" onClick={() => { pollRef.current = null; setPoll(null); }}>New poll</button></div>
            </>
          ) : (
            <div className="send">
              <input className="inp" maxLength={70} placeholder="Ask the room a yes/no question…" value={pollIn} onChange={(e) => setPollIn(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && pollIn.trim()) { api.current?.poll(pollIn); setPollIn(""); } }} />
              <button className="btn sm" disabled={!pollIn.trim()} onClick={() => { api.current?.poll(pollIn); setPollIn(""); }}>Start</button>
            </div>
          )}
          {room === "party" && (
            <>
              <div className="lbl">Party</div>
              <div className="acts">
                <button className="btn g" onClick={() => setPanel("orb")}>🎧 DJ deck</button>
                <button className="btn g" onClick={() => api.current?.orb({ k: "party" })}>💃 Dance party</button>
                <button className="btn g" onClick={() => api.current?.orb({ k: "fx", v: "confetti" })}>🎉 Confetti</button>
              </div>
            </>
          )}
          {room === "lounge" && (
            <>
              <div className="lbl">In the lounge</div>
              <div className="acts">
                <button className="btn g" onClick={() => act(`☕ ${name} grabbed a coffee. Join me!`)}>☕ Grab a coffee</button>
                <button className="btn g" onClick={roll}>🎲 Roll the dice</button>
                <button className="btn g" onClick={() => router.push("/games")}>🎮 Mini-games</button>
              </div>
              <div className="send">
                <input className="inp" maxLength={120} placeholder="Post an idea to the wall…" value={idea}
                  onChange={(e) => setIdea(e.target.value)} onKeyDown={(e) => e.key === "Enter" && postIdea()} />
                <button className="btn" onClick={postIdea}>Post</button>
              </div>
            </>
          )}
          <div className="lbl">Meet people</div>
          <div className="acts">
            <button className="btn g" onClick={connect}>✨ Connect me</button>
            <button className="btn g" onClick={() => act(`🤝 ${name} is open to meet people`)}>🤝 Open to chat</button>
          </div>
          {def.huddles.length > 0 && (
            <p className="hint">🔒 Step into a glowing circle on the floor for a private chat with whoever stands in it.</p>
          )}
          <div className="lbl">Places in this world</div>
          {def.zones.map((z) => (
            <div className="it" key={z.id}>
              <span>{z.icon} {z.id === "orb" ? def.orbName : z.name}</span>
              <button className="btn g sm" onClick={() => { api.current?.go(z.id); setPanel(null); }}>Go there</button>
            </div>
          ))}
          {(() => {
            const next = QUESTS.find((q) => !hub.quests.done[q.id]);
            return next ? <div className="coach">🎯 Next quest: {next.title}</div> : <div className="coach">🏆 All quests done</div>;
          })()}
        </div>
      )}

      {panel === "people" && (
        <div className="sheet" role="dialog" aria-label="People here">
          <div className="sh"><b>👥 In {def.name} ({people.length + 1})</b><button className="x2" onClick={() => setPanel(null)} aria-label="Close">×</button></div>
          <div className="it"><span>🟢 You ({name})</span></div>
          {peopleHere.length === 0 && <p className="hint">Nobody else is here yet. Invite a friend, or try another world from 🌐 Worlds.</p>}
          {peopleHere.length > 0 && <button className="btn" onClick={connect}>✨ Connect me with someone</button>}
          {peopleHere.map((p) => (
            <div className="it prow" key={p.id}>
              <div className="pwho">
                <button className="lnk" onClick={() => { setSel(p.id); setPanel(null); }}>{p.n}</button>
                {p.why.length > 0 && <small className="match">★ {p.why.slice(0, 3).join(", ")}</small>}
              </div>
              <span className="acts">
                <button className="btn g sm" onClick={() => act(`👋 ${name} says hi to ${p.n}`)}>👋 Hi</button>
                <button className="btn g sm" onClick={() => { api.current?.goto(p.id); setPanel(null); }}>Go to</button>
              </span>
            </div>
          ))}
        </div>
      )}

      {panel === "menu" && (
        <div className="sheet" role="dialog" aria-label="Menu">
          <div className="sh"><b>☰ Menu</b><button className="x2" onClick={() => setPanel(null)} aria-label="Close">×</button></div>
          <div className="menugrid">
            <button className="btn g" onClick={() => router.push("/community")}>💬 Community</button>
            <button className="btn g" onClick={() => router.push("/games")}>🎮 Mini-games</button>
            <button className="btn g" onClick={() => router.push("/profile")}>🧑 My profile</button>
            <button className="btn g" onClick={() => router.push("/shop")}>🛍️ Shop</button>
            <button className="btn g" onClick={toggleSound}>{snd ? "🔊 Sound on" : "🔇 Sound off"}</button>
            <button className="btn g" onClick={toggleGfx}>{gfx === "high" ? "✨ Glow: on" : "✨ Glow: off (faster)"}</button>
            <button className="btn g" onClick={() => router.push("/")}>🚪 Leave</button>
          </div>
          <div className="lbl">How to move</div>
          <ul className="how">
            <li><b>Tap or click the floor</b> to walk there</li>
            <li><b>Joystick</b> (phone) or <b>W A S D / arrows</b> (computer)</li>
            <li><b>Drag</b> the screen to look around</li>
            <li><b>Tap a chair</b> or press <b>E</b> to sit and stand</li>
            <li><b>Walk into a big ring</b> to go to another world</li>
            <li><b>Stand in a green circle</b> for private chat and voice</li>
            <li><b>😀 React</b> floats an emoji over your head</li>
          </ul>
        </div>
      )}

      {panel === "orb" && (
        <div className="sheet orbpanel" role="dialog" aria-label={def.orbName}>
          <div className="sh"><b>🔮 {def.orbName}</b><button className="x2" onClick={() => setPanel(null)} aria-label="Close">×</button></div>
          {room !== "meeting" && (
            <>
              <div className="lbl">Music for the room · the lights follow the song</div>
              <div className="chips">
                {TRACKS.map((t) => (
                  <button key={t.id} className={"chip" + (track === t.id ? " on" : "")} onClick={() => api.current?.orb({ k: "music", track: track === t.id ? null : t.id })}>{t.icon} {t.name}</button>
                ))}
                <button className="chip" onClick={() => { const others = TRACKS.filter((t) => t.id !== track); api.current?.orb({ k: "music", track: others[Math.floor(Math.random() * others.length)].id }); }}>🎲 Surprise me</button>
              </div>
              {track && <p className="hint">{sceneFor(track)?.vibe}. Colours, floor, lasers and glow all follow this song.</p>}
              <div className="it">
                <button className="btn g sm" onClick={() => api.current?.orb({ k: "music", track: null })}>■ Stop</button>
                <label className="inl"><input type="checkbox" checked={hear} onChange={(e) => { setHear(e.target.checked); hearRef.current = e.target.checked; if (!e.target.checked) { stopTrack(); setTrack(null); trackRef.current = null; } }} /> Hear room music</label>
              </div>
              <input type="range" min={0} max={100} value={Math.round(vol * 100)} aria-label="Music volume" onChange={(e) => { const v = Number(e.target.value) / 100; setVol(v); setMusicVolume(v); }} />
            </>
          )}
          <div className="lbl">Lights</div>
          <div className="chips">
            {THEMES.map((t) => <button key={t.id} className={"chip" + (theme === t.id ? " on" : "")} onClick={() => api.current?.orb({ k: "theme", th: t.id })}>{t.n}</button>)}
          </div>
          {room !== "meeting" && (
            <>
              <div className="lbl">Effects (everyone sees them)</div>
              <div className="chips">
                {BURSTS.map((b) => <button key={b.id} className="chip" onClick={() => api.current?.orb({ k: "fx", v: b.id })}>{b.icon} {b.n}</button>)}
                <button className="chip" onClick={() => api.current?.orb({ k: "party" })}>💃 Dance party</button>
              </div>
            </>
          )}
          <div className="lbl">{room === "meeting" ? "Announce to the room" : "Shout to the room"}</div>
          <div className="send">
            <input className="inp" maxLength={80} placeholder="Appears above the console…" value={shout} onChange={(e) => setShout(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && shout.trim()) { api.current?.orb({ k: "shout", text: shout }); setShout(""); } }} />
            <button className="btn sm" onClick={() => { if (shout.trim()) { api.current?.orb({ k: "shout", text: shout }); setShout(""); } }}>Send</button>
          </div>
        </div>
      )}

      {sel && (() => {
        const sid = sel.split("~")[0];
        const mine = hub.me?.id === sid;
        const p = hub.online[sid];
        const nm = p?.name || peerNames[sel] || "Player";
        const isF = hub.friends.some((f) => f.id === sid);
        const asked = hub.reqOut.includes(sid);
        return (
          <div className="pcard" role="dialog" aria-label={`${nm} profile`}>
            <button className="x" onClick={() => setSel(null)} aria-label="Close">×</button>
            <div className="phead"><Dot av={p?.av || "atlas"} name={nm} size={44} on top={p?.top} /><div><b>{nm}</b><div className="hint">{p?.headline || p?.status || "Here with you"}</div></div></div>
            {p?.bio && <p className="pb">{p.bio}</p>}
            {p?.unique && <p className="pb">✨ {p.unique}</p>}
            {p && (p.openTo?.length || 0) > 0 && <div className="chips">{p.openTo!.map((t) => <span key={t} className="chip on">{t}</span>)}</div>}
            {p?.style && <div className="hint">💬 {p.style}{p.askMe ? ` · Ask me about ${p.askMe}` : ""}</div>}
            {p && p.interests.length > 0 && <div className="chips">{p.interests.map((t) => <span key={t} className="chip">{t}</span>)}</div>}
            <div className="acts">
              {p && !mine && !isF && !asked && <button className="btn sm" onClick={() => hub.sendRequest(p)}>Add friend</button>}
              {asked && <span className="hint">Request sent</span>}
              {isF && <button className="btn sm" onClick={() => router.push("/people?chat=" + sid)}>Message</button>}
              <button className="btn g sm" onClick={() => act(`👋 ${name} says hi to ${nm}`)}>👋 Say hi</button>
              <button className="btn g sm" onClick={() => router.push("/profile?id=" + sid)}>Profile</button>
            </div>
            {!mine && (
              <div className="safety">
                <button className="btn g sm" onClick={() => { hub.mute(sid); setSel(null); }}>Mute</button>
                <button className="btn g sm" onClick={() => { hub.block(sid); api.current?.drop(sid); setSel(null); }}>Block</button>
                <button className="btn g sm" onClick={() => { setReportFor(reportFor === sid ? null : sid); setRepReason(""); setRepNote(""); }}>🚩 Report</button>
              </div>
            )}
            {!mine && reportFor === sid && (
              <div className="repbox">
                <div className="hint">Why are you reporting {nm}?</div>
                <div className="chips">
                  {["Harassment", "Spam", "Inappropriate content", "Impersonation", "Something else"].map((r) => (
                    <button key={r} className={"chip" + (repReason === r ? " on" : "")} onClick={() => setRepReason(r)}>{r}</button>
                  ))}
                </div>
                <input className="inp" maxLength={300} placeholder="Add a short note (optional)" value={repNote} onChange={(e) => setRepNote(e.target.value)} />
                <div className="acts">
                  <button className="btn sm" disabled={!repReason} onClick={async () => {
                    try {
                      const r = await fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room, target: nm, reason: repReason, note: repNote, by: name, lines: msgs.filter((m) => m.who === nm).slice(-8).map((m) => `${m.who}: ${m.text}`) }) });
                      toast(r.ok ? "Report sent. Thank you. You can also Block them." : "Could not send the report. Try again in a minute.");
                      if (r.ok) setReportFor(null);
                    } catch {
                      toast("Could not send the report. Check your connection.");
                    }
                  }}>Send report</button>
                  <button className="btn g sm" onClick={() => setReportFor(null)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <nav className="dock" aria-label="World controls">
        {DOCK.map((d) => (
          <button key={d.k} className={"dk" + (panel === d.k ? " on" : "")} onClick={() => toggle(d.k)} aria-label={d.label}>
            <span className="di">{d.icon}</span>
            <span className="dl">{d.label}</span>
            {d.k === "chat" && unread > 0 && <b className="badge static dkb">{unread > 9 ? "9+" : unread}</b>}
          </button>
        ))}
      </nav>

      {entering && (
        <div className="entering" aria-live="polite">
          <div className="ei">{getRoom(entering).icon}</div>
          <b>{getRoom(entering).name}</b>
          <small>{getRoom(entering).tag}</small>
        </div>
      )}
    </div>
  );
}
