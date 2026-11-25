import type { GameId } from "@/lib/games/types";
import type { LevelProgress, MatchRecord, MatchReward, PlayerStats } from "./types";
import { getLevelProgress } from "./leveling";
import { grantTokens } from "@/lib/economy/economy";
import { load, save } from "@/lib/social/store";

const PROGRESSION_STORAGE_KEY = "progression";

export function calculateMatchRewards(
  gameId: GameId,
  placement: number,
  totalPlayers: number,
  finalScore: number,
  isWinner: boolean,
  currentTotalXp: number
): MatchReward {
  const baseMatchXp = 25;
  const placementXp = isWinner || placement === 1 ? 50 : placement <= Math.ceil(totalPlayers / 2) ? 15 : 5;
  const performanceXp = Math.min(50, Math.max(0, Math.floor(finalScore / 10)));
  const totalXp = baseMatchXp + placementXp + performanceXp;

  const tokensEarned = (isWinner || placement === 1 ? 10 : 2) + (finalScore >= 100 ? 5 : 0);
  const rankPointsDelta = isWinner || placement === 1 ? 35 : placement <= 2 ? 15 : 5;

  const previousLevelProgress = getLevelProgress(currentTotalXp);
  const newLevelProgress = getLevelProgress(currentTotalXp + totalXp);
  const leveledUp = newLevelProgress.level > previousLevelProgress.level;

  return {
    baseMatchXp,
    placementXp,
    performanceXp,
    totalXp,
    tokensEarned,
    rankPointsDelta,
    previousLevelProgress,
    newLevelProgress,
    leveledUp,
  };
}

export const INITIAL_PLAYER_STATS: PlayerStats = {
  totalMatches: 0,
  totalWins: 0,
  winRate: 0,
  precisionRate: 85.0,
  totalScore: 0,
  currentStreak: 0,
  bestStreak: 0,
  matchHistory: [],
};

export function loadStoredProgression(): { xp: number; stats: PlayerStats } {
  try {
    const raw = load<{ xp?: number; stats?: Partial<PlayerStats> }>(PROGRESSION_STORAGE_KEY, {});
    const xp = Math.max(0, Number(raw.xp) || 0);
    const s = raw.stats || {};
    const totalMatches = Math.max(0, Number(s.totalMatches) || 0);
    const totalWins = Math.max(0, Number(s.totalWins) || 0);
    const totalScore = Math.max(0, Number(s.totalScore) || 0);
    const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 1000) / 10 : 0;
    const precisionRate = Number.isFinite(s.precisionRate) ? Number(s.precisionRate) : 85.0;
    const currentStreak = Math.max(0, Number(s.currentStreak) || 0);
    const bestStreak = Math.max(currentStreak, Number(s.bestStreak) || 0);
    const matchHistory = Array.isArray(s.matchHistory) ? s.matchHistory : [];

    return {
      xp,
      stats: {
        totalMatches,
        totalWins,
        winRate,
        precisionRate,
        totalScore,
        currentStreak,
        bestStreak,
        matchHistory,
      },
    };
  } catch {
    return { xp: 0, stats: INITIAL_PLAYER_STATS };
  }
}

export function saveStoredProgression(xp: number, stats: PlayerStats) {
  save(PROGRESSION_STORAGE_KEY, { xp, stats });
}

export function recordMatchCompletion(
  gameId: GameId,
  placement: number,
  totalPlayers: number,
  finalScore: number,
  isWinner: boolean
): { reward: MatchReward; stats: PlayerStats; matchRecord: MatchRecord } {
  const current = loadStoredProgression();
  const reward = calculateMatchRewards(
    gameId,
    placement,
    totalPlayers,
    finalScore,
    isWinner,
    current.xp
  );

  const newXp = current.xp + reward.totalXp;
  const newMatches = current.stats.totalMatches + 1;
  const newWins = current.stats.totalWins + (isWinner ? 1 : 0);
  const newScore = current.stats.totalScore + finalScore;
  const newWinRate = Math.round((newWins / newMatches) * 1000) / 10;
  
  // Update precision with a realistic running average
  const matchPrecision = isWinner ? 95 : Math.max(60, Math.min(95, 70 + Math.floor(finalScore / 5)));
  const newPrecisionRate = Math.round(((current.stats.precisionRate * current.stats.totalMatches + matchPrecision) / newMatches) * 10) / 10;

  const newStreak = isWinner ? current.stats.currentStreak + 1 : 0;
  const bestStreak = Math.max(newStreak, current.stats.bestStreak);

  const matchRecord: MatchRecord = {
    id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    gameId,
    timestamp: Date.now(),
    score: finalScore,
    placement,
    totalPlayers,
    won: isWinner,
    xpEarned: reward.totalXp,
    tokensEarned: reward.tokensEarned,
    rankPointsDelta: reward.rankPointsDelta,
  };

  const updatedHistory = [matchRecord, ...current.stats.matchHistory].slice(0, 30);

  const updatedStats: PlayerStats = {
    totalMatches: newMatches,
    totalWins: newWins,
    winRate: newWinRate,
    precisionRate: newPrecisionRate,
    totalScore: newScore,
    currentStreak: newStreak,
    bestStreak,
    matchHistory: updatedHistory,
  };

  saveStoredProgression(newXp, updatedStats);

  // Grant token earnings to wallet if positive
  if (reward.tokensEarned > 0) {
    grantTokens(reward.tokensEarned);
  }

  return { reward, stats: updatedStats, matchRecord };
}
