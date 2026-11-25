import {
  ITEMS as BASE_ITEMS,
  ITEM as BASE_ITEM,
  type Item,
  type Kind,
  type Rarity,
  type Loadout,
  cleanGear,
  KIND_LABEL,
} from "@/lib/economy/catalog";
import type { RankTierName } from "./types";

export type { Kind, Rarity, Loadout, Item };
export { cleanGear, KIND_LABEL };
export const ITEMS = BASE_ITEMS;
export const ITEM = BASE_ITEM;

export interface ItemTacticalStats {
  l1: string;
  v1: number;
  l2: string;
  v2: number;
  l3: string;
  v3: number;
}

export const STAT_SPECS: Record<Kind, ItemTacticalStats> = {
  hoverboard: { l1: "Velocity", v1: 85, l2: "Lift", v2: 72, l3: "Drift", v3: 90 },
  pet: { l1: "Sync", v1: 94, l2: "Radar", v2: 80, l3: "Loyalty", v3: 98 },
  aura: { l1: "Flux", v1: 78, l2: "Radius", v2: 65, l3: "Luminance", v3: 88 },
};

export interface CatalogItem extends Item {
  stats: ItemTacticalStats;
  featured?: boolean;
  requiredTier?: RankTierName;
  tags: string[];
}

export const CATALOG_ITEMS: CatalogItem[] = BASE_ITEMS.map((base) => {
  const baseStats = STAT_SPECS[base.kind];
  // Calculate scaled stats based on rarity and price
  const mult = base.rarity === "epic" ? 1.15 : base.rarity === "rare" ? 1.05 : 1.0;
  const stats: ItemTacticalStats = {
    l1: baseStats.l1,
    v1: Math.min(100, Math.round(baseStats.v1 * mult)),
    l2: baseStats.l2,
    v2: Math.min(100, Math.round(baseStats.v2 * mult)),
    l3: baseStats.l3,
    v3: Math.min(100, Math.round(baseStats.v3 * mult)),
  };

  return {
    ...base,
    stats,
    featured: base.rarity === "epic",
    tags: [base.kind, base.rarity, base.price <= 100 ? "starter" : "elite"],
  };
});

export const CATALOG_MAP: Record<string, CatalogItem> = Object.assign(
  Object.create(null),
  Object.fromEntries(CATALOG_ITEMS.map((item) => [item.id, item]))
) as Record<string, CatalogItem>;

export function getCatalogItem(id: string): CatalogItem | undefined {
  if (typeof id !== "string" || !id || !Object.hasOwn(CATALOG_MAP, id)) {
    return undefined;
  }
  return CATALOG_MAP[id];
}

export function filterCatalog(options: {
  kind?: Kind | "all";
  rarity?: Rarity | "all";
  maxPrice?: number;
  searchTerm?: string;
}): CatalogItem[] {
  return CATALOG_ITEMS.filter((item) => {
    if (options.kind && options.kind !== "all" && item.kind !== options.kind) return false;
    if (options.rarity && options.rarity !== "all" && item.rarity !== options.rarity) return false;
    if (options.maxPrice !== undefined && item.price > options.maxPrice) return false;
    if (options.searchTerm) {
      const q = options.searchTerm.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchBlurb = item.blurb.toLowerCase().includes(q);
      const matchTag = item.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchName && !matchBlurb && !matchTag) return false;
    }
    return true;
  });
}
