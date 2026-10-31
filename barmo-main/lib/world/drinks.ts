import * as THREE from "three";

/** Zero-alcohol drinks you can order from the bartenders. */
export interface Drink { id: string; n: string; icon: string; kind: "mug" | "glass" | "cocktail" | "can"; color: number; line: string }

export const MENUS: Record<"cafe" | "party", Drink[]> = {
  cafe: [
    { id: "flatwhite", n: "Flat white", icon: "☕", kind: "mug", color: 0x8a5a34, line: "One flat white, coming right up." },
    { id: "espresso", n: "Espresso", icon: "🫖", kind: "mug", color: 0x2b1a10, line: "Short and strong. Careful, it's hot." },
    { id: "greentea", n: "Green tea", icon: "🍵", kind: "mug", color: 0x9ab86a, line: "Fresh green tea. Let it steep a moment." },
    { id: "icedlatte", n: "Iced latte", icon: "🧋", kind: "glass", color: 0xc9a27a, line: "Iced latte, extra ice." },
    { id: "water", n: "Water", icon: "💧", kind: "glass", color: 0xbfe6ff, line: "Cold water. Always a good choice." },
  ],
  party: [
    { id: "berryfizz", n: "Berry fizz", icon: "🍹", kind: "cocktail", color: 0xff5ac8, line: "Berry fizz, shaken not stirred. No alcohol, all the fun." },
    { id: "mojito", n: "Virgin mojito", icon: "🍸", kind: "cocktail", color: 0x6bd68a, line: "Mint, lime and soda. Fresh." },
    { id: "orange", n: "Orange juice", icon: "🧃", kind: "glass", color: 0xffa63d, line: "Freshly squeezed." },
    { id: "cola", n: "Cola", icon: "🥤", kind: "can", color: 0xc0392b, line: "Ice cold." },
    { id: "water", n: "Water", icon: "💧", kind: "glass", color: 0xbfe6ff, line: "Stay hydrated out there." },
  ],
};
const ALL = [...MENUS.cafe, ...MENUS.party];
export const drinkById = (id: unknown): Drink | null => (typeof id === "string" ? ALL.find((d) => d.id === id) || null : null);

/** A small held cup, built to sit in a hand (origin = where the fingers grip). */
export function makeCup(d: Drink): THREE.Group {
  const g = new THREE.Group();
  const std = (c: number, r = 0.5, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xdff3ff, roughness: 0.08, transparent: true, opacity: 0.35 });
  if (d.kind === "mug") {
    add(new THREE.CylinderGeometry(0.036, 0.031, 0.08, 14), std(0xf2efe8, 0.4), 0, 0.04);
    add(new THREE.CylinderGeometry(0.031, 0.031, 0.004, 14), std(d.color, 0.3), 0, 0.078);
    const h = add(new THREE.TorusGeometry(0.022, 0.006, 6, 12, Math.PI), std(0xf2efe8, 0.4), 0.04, 0.04);
    h.rotation.z = -Math.PI / 2;
  } else if (d.kind === "glass") {
    add(new THREE.CylinderGeometry(0.034, 0.028, 0.13, 14), glassMat, 0, 0.065);
    add(new THREE.CylinderGeometry(0.03, 0.026, 0.1, 14), std(d.color, 0.2), 0, 0.055);
    const st = add(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 5), std(0xffffff, 0.4), 0.01, 0.1);
    st.rotation.z = 0.12;
  } else if (d.kind === "cocktail") {
    add(new THREE.ConeGeometry(0.05, 0.075, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xdff3ff, roughness: 0.08, transparent: true, opacity: 0.35, side: THREE.DoubleSide }), 0, 0.12).rotation.x = Math.PI;
    add(new THREE.ConeGeometry(0.044, 0.06, 16), std(d.color, 0.2), 0, 0.115).rotation.x = Math.PI;
    add(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 6), glassMat, 0, 0.045);
    add(new THREE.CylinderGeometry(0.03, 0.03, 0.006, 14), glassMat, 0, 0.004);
    add(new THREE.SphereGeometry(0.012, 8, 6), std(0xffd34d, 0.5), 0.04, 0.16);
  } else {
    add(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 14), std(d.color, 0.25, 0.7), 0, 0.06);
    add(new THREE.CylinderGeometry(0.031, 0.031, 0.01, 14), std(0xdddddd, 0.3, 0.8), 0, 0.122);
  }
  return g;
}

export function disposeCup(g: THREE.Object3D) {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.geometry.dispose();
      (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
    }
  });
}
