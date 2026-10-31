import {
  ACCS, AVS, BACKS, FACES, FITS, HAIRS, PALETTE, cfgOf, sanitizeConfig,
  type Acc, type AvatarConfig, type Back, type Face, type Fit, type Hair,
} from "@/lib/world/avatar";

/** Everything social lives in this browser (localStorage) + Supabase Realtime. No new keys, no tables. */
/** Avatar studio choices beyond the base preset (all optional; unknown values are dropped). */
export interface Look {
  skin?: number;
  hair?: number;
  hs?: Hair;
  bottom?: number;
  shoe?: number;
  fit?: Fit;
  back?: Back;
  face?: Face;
  trim?: number;
  gl?: boolean;
  h?: number;
  build?: number;
}

export interface Pub {
  id: string;
  name: string;
  av: string;
  bio: string;
  status: string;
  interests: string[];
  /** Outfit: accessory + shirt colour (optional, falls back to the avatar preset). */
  acc?: Acc;
  top?: number;
  look?: Look;
  /** What I do, in one line. */
  headline?: string;
  /** What I'm here for (picked from OPEN_TO). */
  openTo?: string[];
  /** How I like to communicate (one of COMM_STYLES). */
  style?: string;
  /** Languages, free text. */
  langs?: string;
  /** Something unique about me. */
  unique?: string;
  /** A topic people can ask me about. */
  askMe?: string;
}
export type Profile = Pub;

export interface Report {
  id: string;
  target: string;
  name: string;
  reason: string;
  ts: number;
}

export interface Friend extends Pub {
  since: number;
}
export interface Notice {
  id: string;
  type: "req" | "acc" | "ginv" | "sys";
  text: string;
  ts: number;
  read: boolean;
  from?: Pub;
  gid?: string;
  gname?: string;
}
export interface DM {
  id: string;
  from: string;
  text: string;
  ts: number;
}
export interface GroupInfo {
  id: string;
  name: string;
  joined: number;
}
export interface GMsg {
  id: string;
  from: string;
  name: string;
  text: string;
  ts: number;
}
export interface CMsg {
  id: string;
  room: string;
  from: string;
  name: string;
  av: string;
  text: string;
  ts: number;
}
export interface QueueItem {
  id: string;
  to: string;
  event: string;
  payload: unknown;
  ts: number;
}
export interface QuestState {
  done: Record<string, number>;
  xp: number;
  visited: string[];
  streak: number;
  last: string;
}

export const STATUSES = ["Open to chat", "Playing", "Busy", "Away"];
export const OPEN_TO = ["Collaborating", "Co-founding", "Mentoring", "Being mentored", "Hiring", "Getting hired", "Feedback", "Learning together", "Just chatting"];
export const COMM_STYLES = ["Quick chats", "Deep conversations", "Messages first", "Voice or video calls", "Listener first"];
export const ROOMS = [
  { id: "general", name: "General", icon: "💬" },
  { id: "games", name: "Games", icon: "🎲" },
  { id: "ideas", name: "Ideas", icon: "💡" },
  { id: "help", name: "Help & tips", icon: "🧭" },
];

const NS = "barmo.v5.";

export function load<T>(key: string, dflt: T): T {
  if (typeof window === "undefined") return dflt;
  try {
    const raw = window.localStorage.getItem(NS + key);
    return raw ? (JSON.parse(raw) as T) : dflt;
  } catch {
    return dflt;
  }
}
export function save(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the app keeps working in memory */
  }
}

export function uuid(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return "x" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Stable per-browser id so friends can find you again. */
export function getUid(): string {
  if (typeof window === "undefined") return "";
  let id = load<string>("uid", "");
  if (!id) {
    id = uuid();
    save("uid", id);
  }
  return id;
}

export function loadProfile(): Profile | null {
  const p = load<Profile | null>("profile", null);
  if (!p || !p.name) return null;
  return cleanPub(p, getUid());
}

export function cleanLook(v: unknown): Look {
  const x = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const pal = (val: unknown, list: number[]) => (typeof val === "number" && list.includes(val) ? val : undefined);
  const en = <T extends string>(val: unknown, list: { id: T }[]) => (list.some((o) => o.id === val) ? (val as T) : undefined);
  const num = (val: unknown, lo: number, hi: number) => (typeof val === "number" && isFinite(val) ? Math.min(hi, Math.max(lo, val)) : undefined);
  const out: Look = {
    skin: pal(x.skin, PALETTE.skin), hair: pal(x.hair, PALETTE.hair), bottom: pal(x.bottom, PALETTE.bottom),
    shoe: pal(x.shoe, PALETTE.shoe), trim: pal(x.trim, PALETTE.trim),
    hs: en(x.hs, HAIRS), fit: en(x.fit, FITS), back: en(x.back, BACKS), face: en(x.face, FACES),
    gl: typeof x.gl === "boolean" ? x.gl : undefined, h: num(x.h, 0.94, 1.06), build: num(x.build, 0.9, 1.2),
  };
  (Object.keys(out) as (keyof Look)[]).forEach((k) => out[k] === undefined && delete out[k]);
  return out;
}

/** Full avatar config for the 3D builder from a base preset + outfit + studio choices. */
export function cfgFromPub(p: { av: string; acc?: Acc; top?: number; look?: Look }): AvatarConfig {
  const base = cfgOf(p.av);
  return sanitizeConfig({
    ...base,
    ...(p.acc ? { acc: p.acc } : {}),
    ...(p.top !== undefined ? { top: p.top } : {}),
    ...cleanLook(p.look),
  });
}

const str = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

/** Clamp anything coming from the network or storage. */
export function cleanPub(p: Partial<Pub> | null | undefined, id: string): Pub {
  const x = p || {};
  const interests = Array.isArray(x.interests)
    ? x.interests.map((i) => str(i, 20)).filter(Boolean).slice(0, 5)
    : [];
  return {
    id,
    name: str(x.name, 20) || "Guest",
    av: AVS.some((a) => a.id === x.av) ? (x.av as string) : "atlas",
    bio: str(x.bio, 140),
    status: STATUSES.includes(x.status as string) ? (x.status as string) : "Open to chat",
    interests,
    acc: ACCS.some((a) => a.id === x.acc) ? (x.acc as Acc) : "none",
    top: typeof x.top === "number" && PALETTE.top.includes(x.top) ? x.top : undefined,
    look: cleanLook(x.look),
    headline: str(x.headline, 60),
    openTo: Array.isArray(x.openTo) ? x.openTo.filter((o): o is string => typeof o === "string" && OPEN_TO.includes(o)).slice(0, 4) : [],
    style: COMM_STYLES.includes(x.style as string) ? (x.style as string) : "",
    langs: str(x.langs, 40),
    unique: str(x.unique, 140),
    askMe: str(x.askMe, 60),
  };
}

export function shortCode(): string {
  const a = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

export function timeAgo(ts: number): string {
  const d = Math.max(0, Date.now() - ts);
  if (d < 60_000) return "just now";
  if (d < 3_600_000) return Math.floor(d / 60_000) + "m ago";
  if (d < 86_400_000) return Math.floor(d / 3_600_000) + "h ago";
  return Math.floor(d / 86_400_000) + "d ago";
}
