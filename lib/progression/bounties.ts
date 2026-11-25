import type { GameId } from "@/lib/games/types";
import type { BountyMetric, DailyBounty } from "./types";

export interface BountyTemplate {
  id: string;
  title: string;
  description: string;
  gameId: GameId | "any";
  metric: BountyMetric;
  targetCount: number;
  xpReward: number;
  tokenReward: number;
}

export const BOUNTY_TEMPLATES: BountyTemplate[] = [
  {
    id: "dice_roll",
    title: "Quantum Roller",
    description: "Play 3 rounds in Cyber Dice Duel",
    gameId: "dice",
    metric: "matches",
    targetCount: 3,
    xpReward: 50,
    tokenReward: 15,
  },
  {
    id: "quiz_neural",
    title: "Neural Overclock",
    description: "Score in Neural Quiz Arena",
    gameId: "quiz",
    metric: "matches",
    targetCount: 2,
    xpReward: 60,
    tokenReward: 20,
  },
  {
    id: "race_supersonic",
    title: "Supersonic Ace",
    description: "Complete 2 races in Quantum Warp GP",
    gameId: "race",
    metric: "matches",
    targetCount: 2,
    xpReward: 60,
    tokenReward: 20,
  },
  {
    id: "memory_cipher",
    title: "Matrix Decryption",
    description: "Crack memory sequences in Matrix Memory Lock",
    gameId: "memory",
    metric: "matches",
    targetCount: 2,
    xpReward: 50,
    tokenReward: 15,
  },
  {
    id: "code_sprint",
    title: "Code Lab Speedrun",
    description: "Complete an algorithmic challenge in Code Lab",
    gameId: "cybercode",
    metric: "matches",
    targetCount: 1,
    xpReward: 65,
    tokenReward: 25,
  },
  {
    id: "arena_victor",
    title: "Apex Victor",
    description: "Win 2 matches across any arena mini-game",
    gameId: "any",
    metric: "wins",
    targetCount: 2,
    xpReward: 80,
    tokenReward: 30,
  },
];

export function isDailyResetDue(lastResetIso: string | null | undefined, nowIso?: string): boolean {
  if (!lastResetIso) return true;
  try {
    const lastDate = new Date(lastResetIso).toISOString().slice(0, 10);
    const nowDate = new Date(nowIso || new Date().toISOString()).toISOString().slice(0, 10);
    if (lastDate !== nowDate) return true;
    const diffMs = new Date(nowIso || new Date().toISOString()).getTime() - new Date(lastResetIso).getTime();
    return diffMs >= 86400000;
  } catch {
    return true;
  }
}

export function calculateDailyStreak(
  lastDateStr: string | null | undefined,
  currentStreak: number,
  todayDateStr?: string
): number {
  const today = todayDateStr || new Date().toISOString().slice(0, 10);
  if (!lastDateStr || currentStreak <= 0) return 1;
  if (lastDateStr === today) return currentStreak;

  try {
    const d1 = new Date(lastDateStr + "T00:00:00Z").getTime();
    const d2 = new Date(today + "T00:00:00Z").getTime();
    const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return currentStreak + 1;
    return 1;
  } catch {
    return 1;
  }
}

export function createDailyBounty(
  id: string,
  title: string,
  description: string,
  targetCount: number,
  xpReward: number,
  tokenReward: number,
  gameId: GameId | "any" = "any",
  metric: BountyMetric = "matches",
  dateStr?: string
): DailyBounty {
  const date = dateStr || new Date().toISOString().slice(0, 10);
  return {
    id,
    title,
    description,
    gameId,
    metric,
    targetCount,
    currentCount: 0,
    get progress() {
      return this.currentCount;
    },
    set progress(v: number) {
      this.currentCount = v;
    },
    get target() {
      return this.targetCount;
    },
    set target(v: number) {
      this.targetCount = v;
    },
    xpReward,
    tokenReward,
    completed: false,
    claimed: false,
    date,
  };
}

export function trackBountyProgress(bounty: DailyBounty, delta: number): DailyBounty {
  const updatedCount = Math.min(bounty.targetCount, Math.max(0, bounty.currentCount + Math.max(0, delta)));
  const completed = updatedCount >= bounty.targetCount;
  
  const updated: DailyBounty = {
    ...bounty,
    currentCount: updatedCount,
    completed,
  };

  Object.defineProperty(updated, "progress", {
    get() {
      return this.currentCount;
    },
    set(v: number) {
      this.currentCount = v;
    },
    configurable: true,
    enumerable: true,
  });

  Object.defineProperty(updated, "target", {
    get() {
      return this.targetCount;
    },
    set(v: number) {
      this.targetCount = v;
    },
    configurable: true,
    enumerable: true,
  });

  return updated;
}

export function claimBountyReward(bounty: DailyBounty): {
  tokens: number;
  xp: number;
  claimed: boolean;
  bounty: DailyBounty;
} {
  if (bounty.claimed || !bounty.completed) {
    return { tokens: 0, xp: 0, claimed: true, bounty };
  }
  bounty.claimed = true;
  return {
    tokens: bounty.tokenReward,
    xp: bounty.xpReward,
    claimed: true,
    bounty,
  };
}

/**
 * Deterministic pseudo-random number generator seeded by date string (e.g. "2026-11-22").
 */
function seededRandom(seedStr: string): () => number {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  let s = Math.abs(hash) || 12345;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function getDailyBounties(date?: Date | string): DailyBounty[] {
  const dateStr = typeof date === "string" ? date : (date || new Date()).toISOString().slice(0, 10);
  const rng = seededRandom(dateStr);
  const pool = [...BOUNTY_TEMPLATES];

  // Deterministically shuffle using the daily seed
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = pool[i];
    pool[i] = pool[j];
    pool[j] = temp;
  }

  // Pick first 3 bounties
  return pool.slice(0, 3).map((t, idx) =>
    createDailyBounty(
      `${t.id}_${dateStr}`,
      t.title,
      t.description,
      t.targetCount,
      t.xpReward,
      t.tokenReward,
      t.gameId,
      t.metric,
      dateStr
    )
  );
}

export function getTimeUntilUtcMidnight(): {
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
} {
  const now = new Date();
  const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const diff = Math.max(0, nextMidnight.getTime() - now.getTime());
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return {
    hours,
    minutes,
    seconds,
    formatted: `${pad(hours)}h ${pad(minutes)}m`,
  };
}
