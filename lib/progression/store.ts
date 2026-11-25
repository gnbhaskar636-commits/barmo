"use client";

import { useSyncExternalStore } from "react";
import type { DailyBounty, LevelProgress, PlayerStats } from "./types";
import { getLevelProgress } from "./leveling";
import {
  claimBountyReward,
  getDailyBounties,
  isDailyResetDue,
  trackBountyProgress,
} from "./bounties";
import {
  INITIAL_PLAYER_STATS,
  loadStoredProgression,
  recordMatchCompletion,
  saveStoredProgression,
} from "./matchRewards";
import { grantTokens } from "@/lib/economy/economy";
import { load, save } from "@/lib/social/store";

interface ProgressionStoreState {
  xp: number;
  stats: PlayerStats;
  bounties: DailyBounty[];
  lastReset: string;
}

const BOUNTY_STORAGE_KEY = "bounties";

function getInitialState(): ProgressionStoreState {
  const { xp, stats } = loadStoredProgression();
  const today = new Date().toISOString().slice(0, 10);
  const storedBounties = load<{ date?: string; items?: DailyBounty[] }>(BOUNTY_STORAGE_KEY, {});

  let bounties: DailyBounty[] = [];
  if (storedBounties?.date === today && Array.isArray(storedBounties?.items) && storedBounties.items.length > 0) {
    bounties = storedBounties.items.map((b) => {
      const bounty = { ...b };
      Object.defineProperty(bounty, "progress", {
        get() {
          return this.currentCount;
        },
        set(v: number) {
          this.currentCount = v;
        },
        configurable: true,
        enumerable: true,
      });
      Object.defineProperty(bounty, "target", {
        get() {
          return this.targetCount;
        },
        set(v: number) {
          this.targetCount = v;
        },
        configurable: true,
        enumerable: true,
      });
      return bounty;
    });
  } else {
    bounties = getDailyBounties(today);
    save(BOUNTY_STORAGE_KEY, { date: today, items: bounties });
  }

  return {
    xp,
    stats,
    bounties,
    lastReset: today,
  };
}

let storeState: ProgressionStoreState = {
  xp: 0,
  stats: INITIAL_PLAYER_STATS,
  bounties: [],
  lastReset: "",
};

let initialized = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function initProgressionStore() {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;
  storeState = getInitialState();
  notify();
}

export function refreshProgression() {
  storeState = getInitialState();
  notify();
}

export function claimBountyInStore(id: string): { xp: number; tokens: number } {
  const index = storeState.bounties.findIndex((b) => b.id === id);
  if (index === -1) return { xp: 0, tokens: 0 };

  const bounty = storeState.bounties[index];
  const result = claimBountyReward(bounty);

  if (result.tokens > 0 || result.xp > 0) {
    const updatedBounties = [...storeState.bounties];
    updatedBounties[index] = result.bounty;
    const newXp = storeState.xp + result.xp;

    saveStoredProgression(newXp, storeState.stats);
    save(BOUNTY_STORAGE_KEY, {
      date: new Date().toISOString().slice(0, 10),
      items: updatedBounties,
    });

    if (result.tokens > 0) {
      grantTokens(result.tokens);
    }

    storeState = {
      ...storeState,
      xp: newXp,
      bounties: updatedBounties,
    };
    notify();
  }

  return { xp: result.xp, tokens: result.tokens };
}

export function advanceBountyInStore(
  metric: "wins" | "matches" | "score",
  delta: number,
  gameId?: string
) {
  let changed = false;
  const updatedBounties = storeState.bounties.map((b) => {
    if (b.completed || b.claimed) return b;
    if (b.metric === metric && (b.gameId === "any" || !gameId || b.gameId === gameId)) {
      changed = true;
      return trackBountyProgress(b, delta);
    }
    return b;
  });

  if (changed) {
    save(BOUNTY_STORAGE_KEY, {
      date: new Date().toISOString().slice(0, 10),
      items: updatedBounties,
    });
    storeState = {
      ...storeState,
      bounties: updatedBounties,
    };
    notify();
  }
}

export function useProgression(): {
  stats: PlayerStats;
  bounties: DailyBounty[];
  levelProgress: LevelProgress;
  recordMatch: typeof recordMatchCompletion;
  claimBounty: (id: string) => { xp: number; tokens: number };
  refreshProgression: () => void;
} {
  initProgressionStore();

  const state = useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    () => storeState,
    () => storeState
  );

  const levelProgress = getLevelProgress(state.xp);

  const wrappedRecordMatch: typeof recordMatchCompletion = (...args) => {
    const res = recordMatchCompletion(...args);
    const isWinner = args[4];
    const gameId = args[0];

    advanceBountyInStore("matches", 1, gameId);
    if (isWinner) {
      advanceBountyInStore("wins", 1, gameId);
    }

    const { xp, stats } = loadStoredProgression();
    storeState = {
      ...storeState,
      xp,
      stats,
    };
    notify();
    return res;
  };

  return {
    stats: state.stats,
    bounties: state.bounties,
    levelProgress,
    recordMatch: wrappedRecordMatch,
    claimBounty: claimBountyInStore,
    refreshProgression,
  };
}
