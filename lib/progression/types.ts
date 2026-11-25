import type { GameId } from "@/lib/games/types";
import type { Kind, Loadout } from "@/lib/economy/catalog";

export type RankTierName =
  | "Grandmaster"
  | "Master"
  | "Diamond"
  | "Platinum"
  | "Gold"
  | "Silver"
  | "Bronze";

export interface RankTier {
  name: RankTierName;
  minPoints: number;
  color: string;
  badge: string;
}

export interface LevelProgress {
  level: number;
  title: string;
  badge: string;
  rankTier: RankTier;
  totalXp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  levelFloorXp: number;
  progressXp: number;
  requiredXp: number;
  progressPercent: number; // 0 to 100
  isMaxLevel: boolean;
}

export type BountyMetric =
  | "wins"
  | "matches"
  | "score"
  | "streak"
  | "precision"
  | "speed";

export interface DailyBounty {
  id: string;
  title: string;
  description: string;
  gameId?: GameId | "any";
  metric?: BountyMetric;
  targetCount: number;
  currentCount: number;
  progress: number;
  target: number;
  xpReward: number;
  tokenReward: number;
  completed: boolean;
  claimed: boolean;
  date: string; // YYYY-MM-DD
}

export interface MatchReward {
  baseMatchXp: number;
  placementXp: number;
  performanceXp: number;
  totalXp: number;
  tokensEarned: number;
  rankPointsDelta: number;
  previousLevelProgress: LevelProgress;
  newLevelProgress: LevelProgress;
  leveledUp: boolean;
}

export interface MatchRecord {
  id: string;
  gameId: GameId;
  timestamp: number;
  score: number;
  placement: number;
  totalPlayers: number;
  won: boolean;
  xpEarned: number;
  tokensEarned: number;
  rankPointsDelta: number;
}

export interface PlayerStats {
  totalMatches: number;
  totalWins: number;
  winRate: number;       // 0 to 100
  precisionRate: number; // 0 to 100
  totalScore: number;
  currentStreak: number;
  bestStreak: number;
  matchHistory: MatchRecord[];
}

export type LeaderboardCategory = "global" | "weekly" | "tournaments";

export interface LeaderboardEntry {
  rank: number;
  id: string;
  userId?: string;
  name: string;
  avatar: string;
  tier: RankTier;
  totalPoints: number;
  points?: number;
  wins: number;
  matchesPlayed: number;
  winRate: number;
  trend?: "up" | "down" | "same";
  rankDelta?: number;
  topGame?: GameId | string;
  isBot?: boolean;
  isMe?: boolean;
  category?: LeaderboardCategory;
  onBoard?: boolean;
  timestamp?: number;
  ts?: number;
}

export interface SeasonConfig {
  seasonNumber: number;
  title: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}
