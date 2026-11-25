import type { LeaderboardCategory, LeaderboardEntry, RankTier } from "./types";
import { getTier } from "./leveling";

export interface LeaderboardRawPlayer {
  id?: string;
  userId?: string;
  name?: string;
  nm?: string;
  avatar?: string;
  points?: number;
  totalPoints?: number;
  total?: number;
  wins?: number;
  matchesPlayed?: number;
  winRate?: number;
  ts?: number;
  timestamp?: number;
  onBoard?: boolean;
  tier?: RankTier;
  category?: LeaderboardCategory;
  isBot?: boolean;
  isMe?: boolean;
}

export function resolveLeaderboardTie(
  a: LeaderboardRawPlayer,
  b: LeaderboardRawPlayer
): number {
  const pointsA = a.points ?? a.totalPoints ?? a.total ?? 0;
  const pointsB = b.points ?? b.totalPoints ?? b.total ?? 0;

  if (pointsA !== pointsB) {
    return pointsB - pointsA;
  }

  const tsA = a.ts ?? a.timestamp ?? 0;
  const tsB = b.ts ?? b.timestamp ?? 0;
  if (tsA !== tsB) {
    return tsA - tsB;
  }

  const nameA = a.name ?? a.nm ?? a.id ?? "";
  const nameB = b.name ?? b.nm ?? b.id ?? "";
  return nameA.localeCompare(nameB);
}

export function generateLeaderboard(
  roster: LeaderboardRawPlayer[],
  category: LeaderboardCategory = "global"
): (LeaderboardEntry & { nm: string; total: number; rnk: number })[] {
  const visible = roster.filter((p) => p.onBoard !== false);
  const sorted = [...visible].sort(resolveLeaderboardTie);

  return sorted.map((p, idx) => {
    const pts = p.points ?? p.totalPoints ?? p.total ?? 0;
    const name = p.name ?? p.nm ?? "Player";
    const tier = p.tier || getTier(pts);
    const avatar = p.avatar || "atlas";
    const wins = p.wins ?? Math.floor(pts / 35);
    const matchesPlayed = p.matchesPlayed ?? Math.max(wins, Math.floor(pts / 25));
    const winRate =
      p.winRate ?? (matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 1000) / 10 : 0);

    return {
      rank: idx + 1,
      rnk: idx + 1,
      id: p.id || p.userId || `p_${idx + 1}`,
      userId: p.userId || p.id,
      name,
      nm: name,
      avatar,
      tier,
      totalPoints: pts,
      points: pts,
      total: pts,
      wins,
      matchesPlayed,
      winRate,
      trend: "same",
      isBot: p.isBot,
      isMe: p.isMe,
      category,
      onBoard: p.onBoard !== false,
      ts: p.ts ?? p.timestamp,
      timestamp: p.timestamp ?? p.ts,
    };
  });
}

export function getPodium<T extends { rank?: number }>(
  board: T[]
): { first?: T; second?: T; third?: T } {
  return {
    first: board[0],
    second: board[1],
    third: board[2],
  };
}

export function filterLeaderboardRecords<T extends LeaderboardRawPlayer>(
  records: T[],
  category: LeaderboardCategory
): T[] {
  if (category === "global") return records;

  if (category === "weekly") {
    return records.map((r) => {
      const pts = r.points ?? r.totalPoints ?? r.total ?? 0;
      const weeklyPts = Math.floor(pts * 0.45);
      return {
        ...r,
        points: weeklyPts,
        totalPoints: weeklyPts,
        total: weeklyPts,
      };
    });
  }

  if (category === "tournaments") {
    return records.map((r) => {
      const pts = r.points ?? r.totalPoints ?? r.total ?? 0;
      const cupPts = Math.floor(pts * 0.35);
      return {
        ...r,
        points: cupPts,
        totalPoints: cupPts,
        total: cupPts,
      };
    });
  }

  return records;
}

export function applyMatchScore<T extends LeaderboardRawPlayer>(
  user: T,
  delta: number
): T & { points: number; totalPoints: number; total: number; tier: RankTier } {
  const currentPts = user.points ?? user.totalPoints ?? user.total ?? 0;
  const newPts = Math.max(0, currentPts + delta);
  return {
    ...user,
    points: newPts,
    totalPoints: newPts,
    total: newPts,
    tier: getTier(newPts),
  };
}

export function softResetSeason(points: number): number {
  const safe = Math.max(0, Number.isFinite(points) ? points : 0);
  if (safe <= 1000) return safe;
  return 1000 + Math.floor((safe - 1000) * 0.5);
}

export const LOCAL_RIVALS: LeaderboardRawPlayer[] = [
  { id: "u_vega", name: "Commander Vega", avatar: "atlas", totalPoints: 4920, wins: 142, matchesPlayed: 151, winRate: 94.2, isBot: true },
  { id: "u_cipher", name: "Cipher_99", avatar: "sage", totalPoints: 3850, wins: 118, matchesPlayed: 132, winRate: 89.4, isBot: true },
  { id: "u_lyra", name: "Lyra_Valkyrie", avatar: "clay", totalPoints: 3420, wins: 98, matchesPlayed: 115, winRate: 85.2, isBot: true },
  { id: "u_apex", name: "Apex [Bot]", avatar: "zen", totalPoints: 2150, wins: 65, matchesPlayed: 83, winRate: 78.3, isBot: true },
  { id: "u_nova", name: "Nova [AI]", avatar: "nova", totalPoints: 1400, wins: 45, matchesPlayed: 62, winRate: 72.5, isBot: true },
  { id: "u_viper", name: "Viper [Bot]", avatar: "sol", totalPoints: 1250, wins: 40, matchesPlayed: 59, winRate: 67.8, isBot: true },
  { id: "u_echo", name: "Echo [Bot]", avatar: "luna", totalPoints: 850, wins: 28, matchesPlayed: 45, winRate: 62.2, isBot: true },
  { id: "u_neo", name: "Neo_Glitch", avatar: "sage", totalPoints: 520, wins: 18, matchesPlayed: 33, winRate: 54.5, isBot: true },
  { id: "u_pulse", name: "Pulse_Rider", avatar: "atlas", totalPoints: 280, wins: 10, matchesPlayed: 20, winRate: 50.0, isBot: true },
  { id: "u_byte", name: "Byte_Runner", avatar: "clay", totalPoints: 120, wins: 5, matchesPlayed: 11, winRate: 45.4, isBot: true },
];

export function getLeaderboardEntries(
  category: LeaderboardCategory = "global",
  userStats?: {
    name?: string;
    avatar?: string;
    points?: number;
    wins?: number;
    matches?: number;
    onBoard?: boolean;
  }
): (LeaderboardEntry & { nm: string; total: number; rnk: number })[] {
  let roster = [...LOCAL_RIVALS];

  if (userStats && userStats.name) {
    const userRow: LeaderboardRawPlayer = {
      id: "u_me",
      name: userStats.name,
      avatar: userStats.avatar || "atlas",
      totalPoints: userStats.points ?? 0,
      wins: userStats.wins ?? 0,
      matchesPlayed: userStats.matches ?? 0,
      winRate: userStats.matches && userStats.matches > 0 ? Math.round(((userStats.wins ?? 0) / userStats.matches) * 1000) / 10 : 0,
      onBoard: userStats.onBoard !== false,
      isMe: true,
      ts: 1000,
    };
    roster.push(userRow);
  }

  const filtered = filterLeaderboardRecords(roster, category);
  return generateLeaderboard(filtered, category);
}
