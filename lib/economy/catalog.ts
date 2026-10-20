export type Kind = "hoverboard" | "pet" | "aura";
export type Rarity = "common" | "rare" | "epic";
export type Loadout = Partial<Record<Kind, string>>;
export interface Item { id: string; name: string; kind: Kind; price: number; rarity: Rarity; blurb: string; c1: string; c2: string }

/** Display copy. Prices are enforced by the database (supabase/migrations/003); keep the two in step. */
export const ITEMS: Item[] = [
  { id: "hb_terminal", name: "Terminal", kind: "hoverboard", price: 50, rarity: "common", blurb: "Phosphor-green deck. Boots straight into a shell.", c1: "#08140c", c2: "#39ff7a" },
  { id: "hb_gradient", name: "Gradient Descent", kind: "hoverboard", price: 100, rarity: "rare", blurb: "Purple to blue, always converging. Never overfits the roof.", c1: "#1a1038", c2: "#a66bff" },
  { id: "hb_tensor", name: "Tensor Core", kind: "hoverboard", price: 180, rarity: "epic", blurb: "Fused, fast and suspiciously warm.", c1: "#14120a", c2: "#ffc233" },
  { id: "pet_byte", name: "Byte", kind: "pet", price: 60, rarity: "common", blurb: "A robo-pup. Eight bits of loyalty, zero known bugs.", c1: "#3b4252", c2: "#5ef2e0" },
  { id: "pet_glitch", name: "Glitch", kind: "pet", price: 110, rarity: "rare", blurb: "Mostly a cat. Occasionally a rendering error.", c1: "#2b2147", c2: "#ff4fd8" },
  { id: "pet_neuron", name: "Neuron", kind: "pet", price: 200, rarity: "epic", blurb: "A hologram that thinks it is helping. It is.", c1: "#0d2f33", c2: "#9ffcf0" },
  { id: "aura_attention", name: "Attention Halo", kind: "aura", price: 70, rarity: "common", blurb: "Ten nodes, every one paying attention to you.", c1: "#0b1f25", c2: "#5ef2e0" },
  { id: "aura_stream", name: "Token Stream", kind: "aura", price: 120, rarity: "rare", blurb: "Tokens rise off you in a steady stream.", c1: "#0b2016", c2: "#7cf6a8" },
  { id: "aura_latent", name: "Latent Space", kind: "aura", price: 220, rarity: "epic", blurb: "Orbits through a space only you understand.", c1: "#1d0b2e", c2: "#c45cff" },
];
export const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<string, Item>;
/** Shape-check a loadout from anywhere (storage, other players): only known items of the right kind survive. */
export function cleanGear(e: unknown): Loadout {
  const o = (e && typeof e === "object" ? e : {}) as Record<string, unknown>;
  const out: Loadout = {};
  (["hoverboard", "pet", "aura"] as Kind[]).forEach((k) => {
    const id = o[k];
    if (typeof id === "string" && ITEM[id]?.kind === k) out[k] = id;
  });
  return out;
}
export const KIND_LABEL: Record<Kind, string> = { hoverboard: "Hoverboards", pet: "Pets", aura: "Auras" };
