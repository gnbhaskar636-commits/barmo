import type { LevelProgress, RankTier, RankTierName } from "./types";

export const TIERS: RankTier[] = [
  { name: "Grandmaster", minPoints: 2000, color: "#8b5cf6", badge: "💎" },
  { name: "Master", minPoints: 1200, color: "#06b6d4", badge: "⚡" },
  { name: "Diamond", minPoints: 800, color: "#3b82f6", badge: "🔷" },
  { name: "Platinum", minPoints: 500, color: "#10b981", badge: "🛡️" },
  { name: "Gold", minPoints: 250, color: "#f59e0b", badge: "⭐" },
  { name: "Silver", minPoints: 100, color: "#94a3b8", badge: "⚔️" },
  { name: "Bronze", minPoints: 0, color: "#78716c", badge: "🎯" },
];

export function getTier(points: number): RankTier {
  const safe = Number.isFinite(points) ? points : 0;
  return TIERS.find((t) => safe >= t.minPoints) || TIERS[TIERS.length - 1];
}

export function levelOf(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 1;
  return Math.floor(xp / 100) + 1;
}

export function xpForLevel(lvl: number): number {
  const safe = Math.max(1, Number.isFinite(lvl) ? Math.floor(lvl) : 1);
  return (safe - 1) * 100;
}

export function xpToNextLevel(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 100;
  const remainder = xp % 100;
  return remainder === 0 ? 100 : Math.round(100 - remainder);
}

export function xpProgressPercent(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 0;
  return Math.floor(xp) % 100;
}

export function levelTitle(lvl: number): string {
  const clamped = Math.min(5, Math.max(0, (Number.isFinite(lvl) ? Math.floor(lvl) : 1) - 1));
  return ["Newcomer", "Regular", "Explorer", "Connector", "Host", "Legend"][clamped] || "Legend";
}

export interface RankTitleTier {
  minLevel: number;
  maxLevel: number;
  title: string;
  badge: string;
}

export const RANK_TITLES: RankTitleTier[] = [
  { minLevel: 1, maxLevel: 2, title: "Newcomer", badge: "🎯" },
  { minLevel: 3, maxLevel: 5, title: "Explorer", badge: "🧭" },
  { minLevel: 6, maxLevel: 9, title: "Connector", badge: "⚡" },
  { minLevel: 10, maxLevel: 14, title: "Specialist", badge: "🛡️" },
  { minLevel: 15, maxLevel: 19, title: "Pilot", badge: "🚀" },
  { minLevel: 20, maxLevel: 29, title: "Commander", badge: "⚔️" },
  { minLevel: 30, maxLevel: 39, title: "Warp Master", badge: "🔮" },
  { minLevel: 40, maxLevel: 49, title: "Apex Champion", badge: "🌟" },
  { minLevel: 50, maxLevel: Infinity, title: "Grandmaster", badge: "👑" },
];

export function getRankTitle(lvl: number): string {
  const safe = Math.max(1, Number.isFinite(lvl) ? Math.floor(lvl) : 1);
  const found = RANK_TITLES.find((r) => safe >= r.minLevel && safe <= r.maxLevel);
  return found ? found.title : "Grandmaster";
}

export function getRankBadge(lvl: number): string {
  const safe = Math.max(1, Number.isFinite(lvl) ? Math.floor(lvl) : 1);
  const found = RANK_TITLES.find((r) => safe >= r.minLevel && safe <= r.maxLevel);
  return found ? found.badge : "👑";
}

export function getLevelProgress(totalXp: number): LevelProgress {
  const safeXp = Math.max(0, Number.isFinite(totalXp) ? totalXp : 0);
  const level = levelOf(safeXp);
  const title = getRankTitle(level);
  const badge = getRankBadge(level);
  const levelFloorXp = (level - 1) * 100;
  const nextLevelXp = level * 100;
  const progressXp = Math.floor(safeXp - levelFloorXp);
  const requiredXp = 100;
  const progressPercent = Math.min(100, Math.max(0, Math.floor((progressXp / requiredXp) * 100)));
  const tier = getTier(safeXp);

  return {
    level,
    title,
    badge,
    rankTier: tier,
    totalXp: safeXp,
    currentLevelXp: safeXp,
    nextLevelXp,
    levelFloorXp,
    progressXp,
    requiredXp,
    progressPercent,
    isMaxLevel: false,
  };
}
