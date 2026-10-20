import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type Acc = "none" | "cap" | "crown" | "headphones" | "shades" | "halo" | "visor" | "antenna";
export type Hair = "short" | "long" | "none" | "bun" | "spiky" | "curly" | "mohawk";
export type Fit = "tee" | "hoodie" | "jacket" | "suit";
export type Back = "none" | "backpack" | "wings" | "cape" | "jet";
export type Face = "calm" | "smile" | "wow" | "cool";

export const ACCS: { id: Acc; n: string }[] = [
  { id: "none", n: "None" },
  { id: "cap", n: "Cap" },
  { id: "crown", n: "Crown" },
  { id: "headphones", n: "Headphones" },
  { id: "shades", n: "Shades" },
  { id: "halo", n: "Halo" },
  { id: "visor", n: "Visor" },
  { id: "antenna", n: "Antenna" },
];
export const HAIRS: { id: Hair; n: string }[] = [
  { id: "short", n: "Short" },
  { id: "long", n: "Long" },
  { id: "bun", n: "Bun" },
  { id: "spiky", n: "Spiky" },
  { id: "curly", n: "Curly" },
  { id: "mohawk", n: "Mohawk" },
  { id: "none", n: "Bald" },
];
export const FITS: { id: Fit; n: string }[] = [
  { id: "tee", n: "T-shirt" },
  { id: "hoodie", n: "Hoodie" },
  { id: "jacket", n: "Jacket" },
  { id: "suit", n: "Suit" },
];
export const BACKS: { id: Back; n: string }[] = [
  { id: "none", n: "None" },
  { id: "backpack", n: "Backpack" },
  { id: "wings", n: "Wings" },
  { id: "cape", n: "Cape" },
  { id: "jet", n: "Jetpack" },
];
export const FACES: { id: Face; n: string }[] = [
  { id: "smile", n: "Smile" },
  { id: "calm", n: "Calm" },
  { id: "wow", n: "Wow" },
  { id: "cool", n: "Cool" },
];

export interface AvatarConfig {
  pid: string;
  h: number;
  sh: number;
  head: number;
  build: number;
  leg: number;
  skin: number;
  hair: number;
  hs: Hair;
  gl: boolean;
  top: number;
  bottom: number;
  shoe: number;
  acc: Acc;
  fit: Fit;
  back: Back;
  face: Face;
  trim: number;
}

export const DEF: AvatarConfig = {
  pid: "atlas",
  h: 1,
  sh: 1,
  head: 1,
  build: 1,
  leg: 1,
  skin: 0xe0b894,
  hair: 0x2b2118,
  hs: "short",
  gl: false,
  top: 0x2f3a5a,
  bottom: 0x23252e,
  shoe: 0x15161b,
  acc: "none",
  fit: "tee",
  back: "none",
  face: "smile",
  trim: 0xc8a26b,
};

export interface AvatarPreset {
  id: string;
  n: string;
  c: number;
  o: Partial<AvatarConfig>;
}

export const AVS: AvatarPreset[] = [
  { id: "atlas", n: "Atlas", c: 0xc8a26b, o: { top: 0xc8a26b, hair: 0x2b2118, hs: "short", skin: 0xe0b894, fit: "jacket", trim: 0xf1e0b8 } },
  { id: "sage", n: "Sage", c: 0x7fb59a, o: { top: 0x7fb59a, hs: "long", hair: 0x5a3a24, skin: 0xc68e66, sh: 0.92, fit: "hoodie", trim: 0xece8df } },
  { id: "slate", n: "Slate", c: 0x8fa3c9, o: { top: 0x8fa3c9, hs: "none", gl: true, skin: 0x8d5a3b, build: 1.12, h: 1.04, fit: "suit", trim: 0xc8a26b, face: "cool" } },
  { id: "clay", n: "Clay", c: 0xd98b84, o: { top: 0xd98b84, hs: "bun", hair: 0xb5651d, skin: 0xf1d0b3, h: 0.95, sh: 0.9, fit: "tee", trim: 0xffffff } },
];

export const cfgOf = (id: string): AvatarConfig =>
  Object.assign({}, DEF, (AVS.find((a) => a.id === id) || AVS[0]).o, { pid: id });

export const hex = (c: number) => "#" + c.toString(16).padStart(6, "0");

export const PALETTE = {
  skin: [0xf1d0b3, 0xe0b894, 0xc68e66, 0x8d5a3b, 0x5c3a26],
  hair: [0x1b1512, 0x2b2118, 0x5a3a24, 0xb5651d, 0xc9b48a, 0x8a8d96, 0x6b5bd6, 0xd94f6a, 0x3fa9a0],
  top: [0x2f3a5a, 0xc8a26b, 0x7fb59a, 0x8fa3c9, 0xd98b84, 0xece8df, 0x3b3f4a, 0x6b5bd6, 0xc0392b],
  bottom: [0x23252e, 0x3b4258, 0x4a3f33, 0x6a6f7d, 0x2f3a5a],
  shoe: [0x15161b, 0x4a3f33, 0xece8df, 0xc0392b],
  trim: [0xc8a26b, 0x7fb59a, 0x8fa3c9, 0xd98b84, 0x5ef2c8, 0xc45cff, 0xffd34d, 0xffffff],
};

/** Clamp an untrusted avatar config to values the local builder supports. */
export function sanitizeConfig(x: Partial<AvatarConfig>): AvatarConfig {
  const c = Object.assign({}, DEF, x);
  const num = (v: unknown, lo: number, hi: number, dflt: number) =>
    typeof v === "number" && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt;
  const col = (v: unknown, dflt: number) =>
    typeof v === "number" && v >= 0 && v <= 0xffffff ? Math.round(v) : dflt;
  const pick = <T extends string>(v: unknown, list: { id: T }[], dflt: T): T =>
    list.some((o) => o.id === v) ? (v as T) : dflt;
  return {
    pid: AVS.some((a) => a.id === c.pid) ? c.pid : "atlas",
    h: num(c.h, 0.92, 1.08, 1),
    sh: num(c.sh, 0.85, 1.2, 1),
    head: num(c.head, 0.9, 1.15, 1),
    build: num(c.build, 0.85, 1.25, 1),
    leg: num(c.leg, 0.9, 1.12, 1),
    skin: col(c.skin, DEF.skin),
    hair: col(c.hair, DEF.hair),
    hs: pick(c.hs, HAIRS, "short"),
    gl: !!c.gl,
    top: col(c.top, DEF.top),
    bottom: col(c.bottom, DEF.bottom),
    shoe: col(c.shoe, DEF.shoe),
    acc: pick(c.acc, ACCS, "none"),
    fit: pick(c.fit, FITS, "tee"),
    back: pick(c.back, BACKS, "none"),
    face: pick(c.face, FACES, "smile"),
    trim: col(c.trim, DEF.trim),
  };
}

const M = (c: number, r = 0.7, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });

export function meshOf(c: number, rough = 0.65) {
  return M(c, rough);
}

type V3 = [number, number, number];
interface PartOpts {
  r?: number;
  mt?: number;
  basic?: boolean;
  at?: V3;
  rot?: V3;
  sc?: V3;
}

/** Collects geometry by material and merges it, so one avatar costs a handful of draw calls. */
class Builder {
  private m = new Map<string, { mat: THREE.Material; geos: THREE.BufferGeometry[] }>();
  add(geo: THREE.BufferGeometry, color: number, o: PartOpts = {}) {
    const mtx = new THREE.Matrix4().compose(
      new THREE.Vector3(...(o.at || [0, 0, 0])),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(o.rot || [0, 0, 0]))),
      new THREE.Vector3(...(o.sc || [1, 1, 1]))
    );
    geo.applyMatrix4(mtx);
    const key = [color, o.r ?? 0.65, o.mt ?? 0, o.basic ? 1 : 0].join("|");
    let e = this.m.get(key);
    if (!e) {
      e = {
        mat: o.basic ? new THREE.MeshBasicMaterial({ color }) : M(color, o.r ?? 0.65, o.mt ?? 0),
        geos: [],
      };
      this.m.set(key, e);
    }
    e.geos.push(geo);
    return this;
  }
  into(parent: THREE.Object3D) {
    this.m.forEach((e) => {
      const merged = mergeGeometries(e.geos, false);
      e.geos.forEach((x) => x.dispose());
      if (merged) parent.add(new THREE.Mesh(merged, e.mat));
    });
    return parent;
  }
}

const cyl = (rt: number, rb: number, h: number, s = 12) => new THREE.CylinderGeometry(rt, rb, h, s);
const sph = (r: number, ws = 16, hs = 12) => new THREE.SphereGeometry(r, ws, hs);
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

/** Builds the BARMO avatar from a config. */
export function makeAvatar(x: Partial<AvatarConfig> | string): THREE.Group {
  const c = sanitizeConfig(typeof x === "string" ? cfgOf(x) : x);
  const g = new THREE.Group();
  const leg = 0.72 * c.h * c.leg,
    tor = 0.58 * c.h,
    sw = 0.34 * c.sh,
    bw = 0.26 * c.build,
    hr = 0.15 * c.head,
    ar = 0.54 * c.h;
  const hipY = 0.06 + leg;
  const torMid = hipY + tor / 2;
  const neckY = hipY + tor;
  const hy = neckY + 0.04 + hr;
  const rMid = (sw + bw) / 2;
  const long = c.fit !== "tee";
  const dark = (col: number, k = 0.7) => new THREE.Color(col).multiplyScalar(k).getHex();

  // ---- limbs (animated groups) ----
  const legs: THREE.Group[] = [];
  const arms: THREE.Group[] = [];
  [-1, 1].forEach((s) => {
    const lp = new THREE.Group();
    lp.position.set(s * 0.1 * c.build, hipY, 0);
    new Builder()
      .add(cyl(0.075 * c.build, 0.062 * c.build, leg), c.bottom, { at: [0, -leg / 2, 0] })
      .add(cyl(0.068 * c.build, 0.068 * c.build, 0.05), dark(c.bottom, 0.8), { at: [0, -leg + 0.03, 0] })
      .add(box(0.13, 0.075, 0.27), c.shoe, { at: [0, -leg - 0.02, 0.05], r: 0.5 })
      .add(box(0.135, 0.022, 0.275), c.trim, { at: [0, -leg - 0.06, 0.05], r: 0.4 })
      .into(lp);
    const ap = new THREE.Group();
    ap.position.set(s * (sw + 0.06), neckY - 0.04, 0);
    const sleeveLen = long ? ar * 0.94 : ar * 0.4;
    const ab = new Builder()
      .add(sph(0.07 * Math.max(0.9, c.build)), c.top)
      .add(cyl(0.05 * c.build, 0.046 * c.build, sleeveLen), c.top, { at: [0, -sleeveLen / 2, 0] })
      .add(sph(0.055), c.skin, { at: [0, -ar - 0.015, 0], sc: [1, 1.1, 1] });
    if (!long) ab.add(cyl(0.04 * c.build, 0.037 * c.build, ar - sleeveLen), c.skin, { at: [0, -sleeveLen - (ar - sleeveLen) / 2, 0] });
    else if (c.fit !== "suit") ab.add(cyl(0.048 * c.build, 0.048 * c.build, 0.035), c.trim, { at: [0, -ar * 0.9, 0], r: 0.5 });
    ab.into(ap);
    g.add(lp, ap);
    legs.push(lp);
    arms.push(ap);
  });

  // ---- static body (one merged mesh per material) ----
  const S = new Builder();
  S.add(cyl(sw, bw, tor, 18), c.top, { at: [0, torMid, 0] });
  S.add(cyl(bw * 1.03, bw * 1.03, 0.045, 18), dark(c.bottom, 0.9), { at: [0, hipY + 0.03, 0], r: 0.5 });
  S.add(cyl(hr * 0.36, hr * 0.42, 0.07), c.skin, { at: [0, neckY + 0.015, 0] });
  const fz = (frac: number) => bw + (sw - bw) * frac + 0.006; // torso front surface at height fraction
  if (c.fit === "hoodie") {
    S.add(sph(hr * 1.05), c.top, { at: [0, neckY + hr * 0.2, -hr * 0.6], sc: [1.15, 0.8, 0.6] });
    S.add(box(sw * 1.25, 0.11, 0.03), dark(c.top, 0.82), { at: [0, hipY + 0.14, fz(0.2)] });
    [-1, 1].forEach((s) => S.add(cyl(0.01, 0.01, 0.15, 6), c.trim, { at: [s * 0.045, neckY - 0.09, fz(0.9) + 0.004], r: 0.5 }));
  } else if (c.fit === "jacket") {
    S.add(box(0.025, tor * 0.92, 0.012), c.trim, { at: [0, torMid, fz(0.5) + 0.004], r: 0.35, mt: 0.5 });
    [-1, 1].forEach((s) => S.add(box(hr * 0.5, 0.05, hr * 0.22), dark(c.top, 0.85), { at: [s * hr * 0.42, neckY + 0.01, hr * 0.2], rot: [0.25, 0, s * -0.35] }));
    S.add(box(sw * 0.9, 0.025, 0.012), c.trim, { at: [0, hipY + 0.17, fz(0.25) + 0.004], r: 0.4 });
  } else if (c.fit === "suit") {
    S.add(box(0.15, tor * 0.55, 0.012), 0xf3efe6, { at: [0, neckY - tor * 0.3, fz(0.78) + 0.004] });
    S.add(box(0.04, tor * 0.52, 0.016), c.trim, { at: [0, neckY - tor * 0.3, fz(0.78) + 0.01], r: 0.4 });
    [-1, 1].forEach((s) => S.add(box(0.05, tor * 0.55, 0.014), dark(c.top, 0.78), { at: [s * 0.1, neckY - tor * 0.3, fz(0.78) + 0.006], rot: [0, 0, s * 0.28] }));
  } else {
    S.add(cyl(0.048, 0.048, 0.006, 16), c.trim, { at: [0.09, neckY - 0.15, fz(0.75) + 0.002], rot: [Math.PI / 2, 0, 0], r: 0.4 });
  }

  // head
  S.add(sph(hr, 24, 18), c.skin, { at: [0, hy, 0] });
  [-1, 1].forEach((s) => S.add(sph(hr * 0.2), c.skin, { at: [s * hr * 0.98, hy - hr * 0.02, 0], sc: [0.5, 1, 0.8] }));
  S.add(sph(hr * 0.09), dark(c.skin, 0.93), { at: [0, hy - hr * 0.1, hr * 0.98] });
  // eyebrows + mouth
  const bc = dark(c.hair, 0.9);
  const browY = c.face === "wow" ? hy + hr * 0.5 : hy + hr * 0.38;
  [-1, 1].forEach((s) => {
    const tilt = c.face === "cool" ? s * 0.28 : c.face === "wow" ? 0 : s * -0.08;
    S.add(box(hr * 0.36, hr * 0.06, 0.012), bc, { at: [s * hr * 0.42, browY, hr * 0.9], rot: [0, 0, tilt] });
  });
  const mz = hr * 0.93;
  if (c.face === "smile") S.add(new THREE.TorusGeometry(hr * 0.24, 0.009, 6, 14, Math.PI), 0x7a3f3a, { at: [0, hy - hr * 0.2, mz], rot: [0, 0, Math.PI] });
  else if (c.face === "calm") S.add(box(hr * 0.3, 0.012, 0.01), 0x7a3f3a, { at: [0, hy - hr * 0.42, mz + hr * 0.02] });
  else if (c.face === "wow") S.add(new THREE.TorusGeometry(hr * 0.1, 0.01, 6, 12), 0x7a3f3a, { at: [0, hy - hr * 0.42, mz + hr * 0.03] });
  else S.add(box(hr * 0.34, 0.012, 0.01), 0x7a3f3a, { at: [hr * 0.04, hy - hr * 0.4, mz + hr * 0.02], rot: [0, 0, 0.22] });

  // hair
  const cap = (frac: number, k = 1.08) => new THREE.SphereGeometry(hr * k, 22, 14, 0, Math.PI * 2, 0, Math.PI * frac);
  if (c.hs !== "none") {
    if (c.hs === "short") S.add(cap(0.5), c.hair, { at: [0, hy + 0.01, 0] });
    if (c.hs === "long") {
      S.add(cap(0.62), c.hair, { at: [0, hy + 0.01, 0] });
      S.add(box(hr * 1.9, hr * 2.3, hr * 0.7), c.hair, { at: [0, hy - hr * 0.55, -hr * 0.7] });
      [-1, 1].forEach((s) => S.add(box(hr * 0.22, hr * 1.5, hr * 0.7), c.hair, { at: [s * hr * 0.98, hy - hr * 0.35, -hr * 0.2] }));
    }
    if (c.hs === "bun") {
      S.add(cap(0.52), c.hair, { at: [0, hy + 0.01, 0] });
      S.add(sph(hr * 0.5), c.hair, { at: [0, hy + hr * 1.05, -hr * 0.35] });
    }
    if (c.hs === "spiky") {
      S.add(cap(0.45), c.hair, { at: [0, hy + 0.01, 0] });
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const px = Math.cos(a) * hr * 0.55, pz = Math.sin(a) * hr * 0.55;
        S.add(new THREE.ConeGeometry(hr * 0.24, hr * 0.8, 6), c.hair, { at: [px, hy + hr * 1.0, pz], rot: [pz * 1.2, 0, -px * 1.2] });
      }
      S.add(new THREE.ConeGeometry(hr * 0.26, hr * 0.9, 6), c.hair, { at: [0, hy + hr * 1.12, 0] });
    }
    if (c.hs === "curly") {
      S.add(cap(0.5), c.hair, { at: [0, hy + 0.01, 0] });
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2, ring = i % 2 ? 0.75 : 0.45, yy = i % 2 ? 0.78 : 0.98;
        S.add(sph(hr * 0.3, 8, 6), c.hair, { at: [Math.cos(a) * hr * ring, hy + hr * yy, Math.sin(a) * hr * ring] });
      }
    }
    if (c.hs === "mohawk") {
      S.add(cap(0.32, 1.03), dark(c.hair, 0.6), { at: [0, hy + 0.02, 0] });
      for (let i = -3; i <= 3; i++) {
        S.add(new THREE.ConeGeometry(hr * 0.16, hr * (0.9 - Math.abs(i) * 0.08), 5), c.hair, { at: [0, hy + hr * 0.95, i * hr * 0.26] });
      }
    }
  }
  if (c.gl) [-1, 1].forEach((s) => S.add(new THREE.TorusGeometry(hr * 0.34, 0.012, 6, 14), 0x111111, { at: [s * hr * 0.42, hy + hr * 0.08, hr * 0.98], r: 0.3 }));

  // accessories
  if (c.acc === "cap") {
    S.add(cap(0.45, 1.12), 0xc0392b, { at: [0, hy + 0.02, 0], r: 0.6 });
    S.add(box(hr * 1.4, 0.02, hr * 0.9), 0xa02f23, { at: [0, hy + hr * 0.42, hr * 0.85], r: 0.6 });
  } else if (c.acc === "crown") {
    S.add(cyl(hr * 0.85, hr * 0.65, hr * 0.55, 5), 0xf1c40f, { at: [0, hy + hr * 1.05, 0], r: 0.25, mt: 0.85 });
  } else if (c.acc === "headphones") {
    S.add(new THREE.TorusGeometry(hr * 1.05, 0.02, 8, 24, Math.PI), 0x222222, { at: [0, hy, 0], r: 0.4 });
    [-1, 1].forEach((s) => S.add(cyl(hr * 0.32, hr * 0.32, hr * 0.22, 14), c.trim, { at: [s * hr * 1.05, hy, 0], rot: [0, 0, Math.PI / 2], r: 0.4, mt: 0.3 }));
  } else if (c.acc === "shades") {
    S.add(box(hr * 1.7, hr * 0.34, 0.02), 0x0b0b0b, { at: [0, hy + hr * 0.08, hr * 0.99], r: 0.15, mt: 0.4 });
  } else if (c.acc === "halo") {
    S.add(new THREE.TorusGeometry(hr * 0.8, 0.015, 8, 28), 0xffe08a, { at: [0, hy + hr * 1.6, 0], rot: [Math.PI / 2, 0, 0], basic: true });
  } else if (c.acc === "visor") {
    S.add(box(hr * 1.85, hr * 0.3, 0.025), 0x5ef2c8, { at: [0, hy + hr * 0.1, hr * 0.99], basic: true });
    S.add(box(hr * 2.05, 0.015, hr * 1.9), 0x1b1f2b, { at: [0, hy + hr * 0.29, 0], r: 0.4, mt: 0.5 });
  } else if (c.acc === "antenna") {
    S.add(cyl(0.01, 0.01, hr * 1.0, 6), 0x9aa3b8, { at: [hr * 0.3, hy + hr * 1.45, 0], mt: 0.7, r: 0.3 });
    S.add(sph(0.03, 8, 6), 0xff5a4d, { at: [hr * 0.3, hy + hr * 1.98, 0], basic: true });
  }

  // back items (static ones merge into S)
  const backZ = -(rMid + 0.02);
  const eyes: THREE.Group[] = [];
  const extras: Record<string, unknown> = {};
  if (c.back === "backpack") {
    S.add(box(sw * 1.45, tor * 0.72, 0.17), dark(c.bottom, 1.1), { at: [0, torMid - 0.02, backZ - 0.07], r: 0.7 });
    S.add(box(sw * 1.0, tor * 0.28, 0.05), c.trim, { at: [0, torMid - tor * 0.2, backZ - 0.17], r: 0.5 });
    [-1, 1].forEach((s) => S.add(box(0.035, tor * 0.78, 0.015), dark(c.bottom, 1.2), { at: [s * sw * 0.48, torMid + 0.02, fz(0.6) + 0.004] }));
  }
  S.into(g);

  if (c.back === "wings") {
    const wl: THREE.Group[] = [];
    [-1, 1].forEach((s) => {
      const piv = new THREE.Group();
      piv.position.set(s * 0.06, torMid + tor * 0.18, backZ - 0.02);
      const wb = new Builder();
      for (let i = 0; i < 5; i++) {
        const len = 0.45 + i * 0.09;
        wb.add(box(0.07, len, 0.012), i % 2 ? c.trim : dark(c.trim, 0.85), {
          at: [s * (0.08 + i * 0.085), len / 2 - 0.05 - i * 0.02, 0],
          rot: [0, 0, s * -(0.2 + i * 0.16)],
          basic: true,
        });
      }
      wb.into(piv);
      g.add(piv);
      wl.push(piv);
    });
    extras.wings = wl;
  }
  if (c.back === "cape") {
    const piv = new THREE.Group();
    piv.position.set(0, neckY - 0.02, backZ - 0.01);
    new Builder().add(box(sw * 2.0, tor * 1.35, 0.022), c.trim, { at: [0, -tor * 0.67, -0.01], r: 0.8 }).add(box(sw * 2.05, 0.04, 0.03), dark(c.trim, 0.7), { at: [0, -0.01, 0], r: 0.6 }).into(piv);
    g.add(piv);
    extras.cape = piv;
  }
  if (c.back === "jet") {
    const fl: THREE.Mesh[] = [];
    const jb = new Builder();
    [-1, 1].forEach((s) => {
      jb.add(cyl(0.055, 0.06, tor * 0.62, 10), 0x4a5266, { at: [s * 0.1, torMid, backZ - 0.09], r: 0.35, mt: 0.7 });
      jb.add(cyl(0.062, 0.062, 0.03, 10), c.trim, { at: [s * 0.1, torMid + tor * 0.3, backZ - 0.09], r: 0.3, mt: 0.6 });
    });
    jb.into(g);
    [-1, 1].forEach((s) => {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 8), new THREE.MeshBasicMaterial({ color: 0x5ec8ff, transparent: true, opacity: 0.85 }));
      f.rotation.x = Math.PI;
      f.position.set(s * 0.1, torMid - tor * 0.31 - 0.11, backZ - 0.09);
      g.add(f);
      fl.push(f);
    });
    extras.flames = fl;
  }

  // eyes (separate so they can blink)
  [-1, 1].forEach((s) => {
    const eg = new THREE.Group();
    eg.position.set(s * hr * 0.4, hy + hr * 0.05, hr * 0.9);
    new Builder()
      .add(sph(hr * 0.15, 10, 8), 0xffffff, { sc: [1, 1, 0.55], r: 0.3 })
      .add(sph(hr * 0.085, 8, 6), 0x14110d, { at: [0, 0, hr * 0.06], sc: [1, 1, 0.6], r: 0.2 })
      .add(sph(hr * 0.03, 6, 5), 0xffffff, { at: [hr * 0.03, hr * 0.03, hr * 0.1], basic: true })
      .into(eg);
    g.add(eg);
    eyes.push(eg);
  });

  g.userData.top = hy + hr + (c.hs === "spiky" || c.hs === "mohawk" ? hr * 0.5 : 0) + (c.acc === "crown" || c.acc === "halo" || c.acc === "antenna" ? hr * 0.6 : 0);
  g.userData.hipY = hipY;
  g.userData.legs = legs;
  g.userData.arms = arms;
  g.userData.eyes = eyes;
  g.userData.phase = Math.random() * 3000;
  Object.assign(g.userData, extras);
  return g;
}
