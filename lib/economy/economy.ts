"use client";

import { useSyncExternalStore } from "react";
import { accountReady, authClient, subscribeAccount } from "@/lib/account/account";
import { ITEM, type Kind, type Loadout } from "@/lib/economy/catalog";
import { QUESTS } from "@/lib/social/quests";
import { save } from "@/lib/social/store";

export interface Wallet {
  loaded: boolean;
  tokens: number;
  earned: number;
  owned: string[];
  claimed: string[];
  equipped: Loadout;
  onBoard: boolean;
  lastDaily: string | null;
  err: string;
}
export interface Row { rnk: number; nm: string; avatar: string; total: number }

const BLANK: Wallet = { loaded: false, tokens: 0, earned: 0, owned: [], claimed: [], equipped: {}, onBoard: true, lastDaily: null, err: "" };
let w: Wallet = BLANK;
const subs = new Set<() => void>();
const set = (p: Partial<Wallet>) => {
  w = { ...w, ...p };
  subs.forEach((f) => f());
};
export const useWallet = (): Wallet =>
  useSyncExternalStore((cb) => { subs.add(cb); return () => void subs.delete(cb); }, () => w, () => w);

const QUEST_IDS = new Set(QUESTS.map((q) => q.id));
const today = () => new Date().toISOString().slice(0, 10);

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<{ ok: true; data: T } | { ok: false; msg: string }> {
  const { data, error } = await authClient().rpc(fn, args);
  return error ? { ok: false, msg: error.message } : { ok: true, data: data as T };
}

function cleanLoadout(e: unknown): Loadout {
  const o = (e || {}) as Record<string, unknown>;
  const out: Loadout = {};
  (["hoverboard", "pet", "aura"] as Kind[]).forEach((k) => {
    const id = o[k];
    if (typeof id === "string" && ITEM[id]?.kind === k) out[k] = id;
  });
  return out;
}

export async function refresh() {
  if (!accountReady()) return;
  try {
    const c = authClient();
    const [a, b, d] = await Promise.all([
      c.from("wallets").select("tokens,earned,last_daily,equipped,on_board").maybeSingle(),
      c.from("purchases").select("item_id"),
      c.from("quest_claims").select("quest_id"),
    ]);
    if (a.error) throw a.error;
    const equipped = cleanLoadout(a.data?.equipped);
    save("loadout", equipped); // the 3D lounge reads this when it starts
    set({
      loaded: true, err: "",
      tokens: a.data?.tokens ?? 0, earned: a.data?.earned ?? 0, lastDaily: a.data?.last_daily ?? null,
      onBoard: a.data?.on_board ?? true, equipped,
      owned: (b.data || []).map((r: { item_id: string }) => r.item_id),
      claimed: (d.data || []).map((r: { quest_id: string }) => r.quest_id),
    });
  } catch (e) {
    const m = (e as { code?: string; message?: string }) || {};
    set({ loaded: true, err: m.code === "42P01" ? "Shop tables are not set up yet. Run supabase/migrations/003_token_economy.sql." : m.message || "Could not load your wallet." });
  }
}

let started = false;
export function initEconomy() {
  const tick = () => {
    if (accountReady() && !started) { started = true; void refresh(); }
    else if (!accountReady() && started) { started = false; w = BLANK; subs.forEach((f) => f()); }
  };
  subscribeAccount(tick);
  tick();
}

let busy = false;
const tried = new Set<string>();
/** Daily login bonus (+10, once per UTC day). Returns tokens earned. */
export async function claimDaily(): Promise<number> {
  if (!accountReady() || w.lastDaily === today()) return 0;
  const r = await rpc<number>("claim_daily");
  if (!r.ok) return 0;
  await refresh();
  return r.data || 0;
}
/** Claims every finished quest once. The server holds the reward table and pays each quest a single time. */
export async function claimQuests(done: string[]): Promise<number> {
  if (!accountReady() || !w.loaded || busy) return 0;
  const todo = done.filter((id) => QUEST_IDS.has(id) && !w.claimed.includes(id) && !tried.has(id));
  if (!todo.length) return 0;
  busy = true;
  let sum = 0;
  try {
    for (const id of todo) {
      tried.add(id);
      const r = await rpc<number>("claim_quest", { q: id });
      if (r.ok) sum += r.data || 0;
    }
  } finally {
    busy = false;
  }
  await refresh();
  return sum;
}

export async function buy(id: string): Promise<string> {
  const r = await rpc<number>("buy_item", { i: id });
  if (!r.ok) return r.msg;
  await refresh();
  return "";
}
export async function equip(id: string, on: boolean): Promise<string> {
  const r = await rpc<unknown>("equip_item", { i: id, on_: on });
  if (!r.ok) return r.msg;
  await refresh();
  return "";
}
export async function setBoard(v: boolean) {
  await rpc("set_board_visibility", { v });
  await refresh();
}
export async function leaderboard(): Promise<Row[]> {
  const { data, error } = await authClient().rpc("leaderboard", { lim: 20 });
  if (error || !Array.isArray(data)) return [];
  return (data as { rnk: number; nm: string; avatar: string; total: number }[]).map((r) => ({ rnk: Number(r.rnk), nm: r.nm, avatar: r.avatar, total: r.total }));
}
