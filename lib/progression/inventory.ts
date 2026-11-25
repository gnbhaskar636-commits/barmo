import { ITEM, cleanGear, type Kind, type Loadout } from "@/lib/economy/catalog";

export function equipItem(
  loadout: Loadout,
  itemId: string,
  owned: string[]
): { success: boolean; loadout: Loadout; error?: string } {
  if (typeof itemId !== "string" || !itemId || !Object.hasOwn(ITEM, itemId)) {
    return { success: false, loadout, error: "unknown item" };
  }
  const item = ITEM[itemId];
  if (!owned.includes(itemId)) {
    return { success: false, loadout, error: "you do not own this yet" };
  }
  const next: Loadout = { ...loadout, [item.kind]: itemId };
  return { success: true, loadout: cleanGear(next) };
}

export function unequipItem(loadout: Loadout, kind: Kind): Loadout {
  const next: Loadout = { ...loadout };
  delete next[kind];
  return cleanGear(next);
}

export function validatePurchase(
  itemId: string,
  tokenBalance: number,
  owned: string[]
): { success: boolean; error?: string; remainingTokens?: number } {
  if (typeof itemId !== "string" || !itemId || !Object.hasOwn(ITEM, itemId)) {
    return { success: false, error: "unknown item" };
  }
  const item = ITEM[itemId];
  if (owned.includes(itemId)) {
    return { success: false, error: "you already own this" };
  }
  if (typeof tokenBalance !== "number" || !Number.isSafeInteger(tokenBalance) || tokenBalance < 0) {
    return { success: false, error: "not enough tokens yet" };
  }
  if (tokenBalance < item.price) {
    return { success: false, error: "not enough tokens yet" };
  }
  return { success: true, remainingTokens: tokenBalance - item.price };
}

export function toggleBoardVisibility(current: boolean): boolean {
  return !current;
}
