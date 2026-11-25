import type { Kind, Loadout } from "@/lib/economy/catalog";
import { CATALOG_MAP, cleanGear, getCatalogItem, type CatalogItem } from "./catalog";
import { equipItem, unequipItem } from "./inventory";

export { equipItem, unequipItem };

export interface EquipResult {
  success: boolean;
  loadout: Loadout;
  error?: string;
  previousItem?: string;
}

export interface ToggleEquipResult extends EquipResult {
  isEquipped: boolean;
}

export function isItemEquipped(loadout: Loadout, itemId: string): boolean {
  const item = getCatalogItem(itemId);
  if (!item) return false;
  return loadout[item.kind] === itemId;
}

export function equipItemInLoadout(loadout: Loadout, itemId: string, owned: string[]): EquipResult {
  if (typeof itemId !== "string" || !itemId || !Object.hasOwn(CATALOG_MAP, itemId)) {
    return { success: false, loadout, error: "unknown item" };
  }
  const item = getCatalogItem(itemId);
  if (!item) return { success: false, loadout, error: "unknown item" };
  if (!owned.includes(itemId)) return { success: false, loadout, error: "you do not own this yet" };

  const previousItem = loadout[item.kind];
  const next: Loadout = { ...loadout, [item.kind]: itemId };
  return { success: true, loadout: cleanGear(next), previousItem };
}

export function unequipItemFromLoadout(loadout: Loadout, kind: Kind): Loadout {
  const next: Loadout = { ...loadout };
  delete next[kind];
  return cleanGear(next);
}

export function toggleEquipItem(loadout: Loadout, itemId: string, owned: string[]): ToggleEquipResult {
  if (typeof itemId !== "string" || !itemId || !Object.hasOwn(CATALOG_MAP, itemId)) {
    return { success: false, loadout, isEquipped: false, error: "unknown item" };
  }
  const item = getCatalogItem(itemId);
  if (!item) return { success: false, loadout, isEquipped: false, error: "unknown item" };
  const currentlyEquipped = isItemEquipped(loadout, itemId);
  if (currentlyEquipped) {
    return {
      success: true,
      loadout: unequipItemFromLoadout(loadout, item.kind),
      isEquipped: false,
      previousItem: itemId,
    };
  } else {
    const res = equipItemInLoadout(loadout, itemId, owned);
    return { ...res, isEquipped: res.success };
  }
}

export function getEquippedSlots(loadout: Loadout): Record<Kind, CatalogItem | null> {
  return {
    hoverboard: loadout.hoverboard ? getCatalogItem(loadout.hoverboard) || null : null,
    pet: loadout.pet ? getCatalogItem(loadout.pet) || null : null,
    aura: loadout.aura ? getCatalogItem(loadout.aura) || null : null,
  };
}
