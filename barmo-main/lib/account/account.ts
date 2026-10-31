"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/client";
import { cleanPub, getUid, load, save, type Friend, type Profile, type QuestState } from "@/lib/social/store";
import { AUTH_ENABLED } from "@/lib/config";

/**
 * Optional accounts. Guests keep working exactly as before; signing in adds a private cloud
 * copy of your profile + quest progress (table lounge_profiles, row-level security).
 * The anonymous Realtime client in lib/supabase/client.ts is not touched.
 */
const T = "lounge_profiles";
const EMPTY_Q: QuestState = { done: {}, xp: 0, visited: [], streak: 0, last: "" };

export interface AccountState {
  email: string | null;
  status: "off" | "guest" | "syncing" | "synced" | "error";
  msg: string;
}
let state: AccountState = { email: null, status: isSupabaseConfigured() ? "guest" : "off", msg: "" };
const subs = new Set<() => void>();
function set(p: Partial<AccountState>) {
  state = { ...state, ...p };
  subs.forEach((f) => f());
}
export interface Social {
  friends: Friend[];
  blocked: string[];
  muted: string[];
}
const localSocial = (): Social => ({ friends: load<Friend[]>("friends", []), blocked: load<string[]>("blocked", []), muted: load<string[]>("muted", []) });
/** Restore friends/blocked/muted from the cloud on a new device (shape-checked, capped). */
function adoptSocial(s: unknown) {
  const o = (s || {}) as Partial<Social>;
  const ids = (a: unknown) => (Array.isArray(a) ? a.filter((x): x is string => typeof x === "string").slice(0, 300) : []);
  if (Array.isArray(o.friends)) {
    const f = o.friends
      .filter((x) => x && typeof x.id === "string")
      .slice(0, 200)
      .map((x) => ({ ...cleanPub(x, x.id), since: typeof x.since === "number" ? x.since : Date.now() }));
    save("friends", f);
  }
  save("blocked", ids(o.blocked));
  save("muted", ids(o.muted));
}
export const accountReady = () => ready && !!pulledFor;
export const subscribeAccount = (cb: () => void) => {
  subs.add(cb);
  return () => void subs.delete(cb);
};

export function useAccount(): AccountState {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => void subs.delete(cb);
    },
    () => state,
    () => state
  );
}

let auth: SupabaseClient | null = null;
export const authClient = (): SupabaseClient => db();
function db(): SupabaseClient {
  if (!auth) {
    auth = createBrowserClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return auth;
}

function friendly(e: unknown): string {
  const x = e as { code?: string; message?: string };
  if (x?.code === "23505") return "This lounge identity is already linked to another account.";
  if (/not enabled|unsupported provider/i.test(x?.message || "")) return "Google sign-in is not switched on in Supabase yet. See the README.";
  if (x?.code === "42P01") return "Cloud tables are not set up yet. Run supabase/migrations/001_lounge_profiles.sql.";
  return x?.message || "Sync failed. Your data is safe on this device.";
}

/** Union of two progress records: nothing earned on either device is lost. */
export function mergeQuests(a: QuestState, b: Partial<QuestState> | null | undefined): QuestState {
  const o = { ...EMPTY_Q, ...(b || {}) };
  const done: Record<string, number> = { ...o.done };
  for (const [k, v] of Object.entries(a.done || {})) done[k] = done[k] ? Math.min(done[k], v) : v;
  return {
    done,
    xp: Math.max(a.xp || 0, o.xp || 0),
    visited: [...new Set([...(a.visited || []), ...(o.visited || [])])],
    streak: Math.max(a.streak || 0, o.streak || 0),
    last: (a.last || "") > (o.last || "") ? a.last : o.last,
  };
}
const sameQ = (a: QuestState, b: QuestState) =>
  a.xp === b.xp && a.streak === b.streak && a.visited.length === b.visited.length && Object.keys(a.done).length === Object.keys(b.done).length;

let inited = false;
let pulledFor: string | null = null;
let ready = false; // pushes are blocked until the first pull finished, so a fresh device can never overwrite the cloud

async function pull(userId: string, email: string) {
  pulledFor = userId;
  ready = false;
  set({ email, status: "syncing", msg: "" });
  try {
    const c = db();
    const { data, error } = await c.from(T).select("uid,pub,quests,social").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    const localQ = load<QuestState>("quests", EMPTY_Q);
    if (!data) {
      const { error: e2 } = await c.from(T).insert({ user_id: userId, uid: getUid(), pub: load<Profile | null>("profile", null) ?? {}, quests: localQ, social: localSocial() });
      if (e2) throw e2;
    } else if (data.uid === getUid()) {
      const merged = mergeQuests(localQ, data.quests as Partial<QuestState>);
      if (!sameQ(merged, localQ)) {
        save("quests", merged);
        location.reload();
        return;
      }
    } else {
      // New browser/device: adopt the account's lounge identity so friends still recognise you.
      save("uid", data.uid);
      adoptSocial(data.social);
      const p = data.pub as Partial<Profile> | null;
      if (p && p.name) save("profile", cleanPub(p, data.uid));
      save("quests", mergeQuests(localQ, data.quests as Partial<QuestState>));
      location.reload();
      return;
    }
    ready = true;
    set({ status: "synced" });
  } catch (e) {
    set({ status: "error", msg: friendly(e) });
  }
}

export async function initAccount() {
  if (inited) return;
  inited = true;
  if (!AUTH_ENABLED) return set({ status: "guest" }); // login is switched off (lib/config.ts): stay a guest
  if (!isSupabaseConfigured()) return set({ status: "off" });
  try {
    const c = db();
    const { data } = await c.auth.getSession();
    if (data.session) void pull(data.session.user.id, data.session.user.email ?? "");
    c.auth.onAuthStateChange((ev, s) => {
      if (ev === "SIGNED_IN" && s && pulledFor !== s.user.id) void pull(s.user.id, s.user.email ?? "");
      if (ev === "SIGNED_OUT") {
        pulledFor = null;
        ready = false;
        set({ email: null, status: "guest", msg: "" });
      }
    });
  } catch (e) {
    set({ status: "error", msg: friendly(e) });
  }
}

let timer: number | undefined;
/** Debounced cloud save of the current profile + progress. No-op for guests. */
export function schedulePush(me: Profile | null, q: QuestState, social?: Social) {
  if (!ready || !pulledFor || !me) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(async () => {
    try {
      set({ status: "syncing" });
      const { error } = await db()
        .from(T)
        .upsert({ user_id: pulledFor, uid: getUid(), pub: me, quests: q, ...(social ? { social } : {}), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
      set({ status: "synced", msg: "" });
    } catch (e) {
      set({ status: "error", msg: friendly(e) });
    }
  }, 2500);
}

export async function signIn(email: string, password: string): Promise<string> {
  const { error } = await db().auth.signInWithPassword({ email: email.trim(), password });
  return error ? error.message : "";
}
export async function signUp(email: string, password: string): Promise<string> {
  const { data, error } = await db().auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: location.origin + "/profile" } });
  if (error) return error.message;
  return data.session ? "" : "Check your email to confirm your account, then sign in.";
}
/** One-tap Google sign-in. Redirects to Google, then back to /profile where sync starts by itself. */
export async function signInGoogle(): Promise<string> {
  const { error } = await db().auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + "/profile" } });
  return error ? friendly(error) : "";
}
export async function signOut() {
  await db().auth.signOut(); // local data stays: you simply continue as a guest
}
