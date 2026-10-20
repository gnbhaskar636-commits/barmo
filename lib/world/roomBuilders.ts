import * as THREE from "three";
import type { Collider } from "@/lib/world/lounge";
import { getRoom, type RoomDef } from "@/lib/world/rooms";

/* ---------- small helpers ---------- */
const std = (c: number, r = 0.7, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
const glow = (c: number, o = 1) => {
  const m = new THREE.MeshBasicMaterial({ color: c, transparent: o < 1, opacity: o, depthWrite: o === 1 });
  if (o < 1) m.blending = THREE.AdditiveBlending;
  return m;
};

function bx(g: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material, col?: Collider[], pad = 0.35) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  g.add(o);
  if (col) col.push({ x, z, w: w / 2 + pad, d: d / 2 + pad });
  return o;
}
function cyl(g: THREE.Object3D, rt: number, rb: number, h: number, x: number, y: number, z: number, m: THREE.Material, seg = 20) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  o.position.set(x, y, z);
  g.add(o);
  return o;
}

/** One-sided wall: only visible from inside, so the camera can sit "behind" it without being blocked. */
function wall(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, rotY: number, m: THREE.Material) {
  const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  o.position.set(x, y, z);
  o.rotation.y = rotY;
  g.add(o);
}

/** A screen drawn on a canvas. `set` redraws it with new text (used for the shared agenda / prompt wall). */
function makeBoard(title: string, text: string, accent: number) {
  const cv = document.createElement("canvas");
  cv.width = 1024;
  cv.height = 384;
  const cx = cv.getContext("2d");
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const css = "#" + accent.toString(16).padStart(6, "0");
  const draw = (body: string) => {
    if (!cx) return;
    const g = cx.createLinearGradient(0, 0, 1024, 384);
    g.addColorStop(0, "#0b1020");
    g.addColorStop(1, "#141a30");
    cx.fillStyle = g;
    cx.fillRect(0, 0, 1024, 384);
    cx.strokeStyle = css;
    cx.lineWidth = 6;
    cx.strokeRect(12, 12, 1000, 360);
    cx.fillStyle = css;
    cx.font = "700 40px system-ui, sans-serif";
    cx.fillText(title, 44, 82);
    cx.fillRect(44, 100, 120, 5);
    cx.fillStyle = "#ece8df";
    cx.font = "600 44px system-ui, sans-serif";
    const words = body.split(/\s+/);
    let line = "";
    let y = 175;
    let rows = 0;
    for (const w of words) {
      const t = line ? line + " " + w : w;
      if (cx.measureText(t).width > 930 && line) {
        cx.fillText(line, 44, y);
        y += 58;
        rows++;
        line = w;
        if (rows >= 4) break;
      } else line = t;
    }
    if (rows < 4) cx.fillText(line, 44, y);
    tex.needsUpdate = true;
  };
  draw(text);
  return { tex, set: (t: string) => draw(t.trim().slice(0, 140) || "…") };
}

function screen(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, rotY: number, accent: number) {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = rotY;
  grp.add(new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, h + 0.3, 0.1), std(0x0a0d16, 0.4, 0.6)));
  const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  s.position.z = 0.06;
  grp.add(s);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.34, 0.05, 0.12), glow(accent));
  trim.position.y = -h / 2 - 0.2;
  grp.add(trim);
  g.add(grp);
}

function plant(g: THREE.Object3D, x: number, z: number, col: Collider[]) {
  cyl(g, 0.35, 0.3, 0.6, x, 0.3, z, std(0x2a2f3f));
  const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1), std(0x4f7a63, 0.8));
  l.position.set(x, 1.2, z);
  g.add(l);
  col.push({ x, z, w: 0.8, d: 0.8 });
}

/** Floor, three one-sided walls + a low south wall, skirting glow. */
function shell(g: THREE.Group, room: RoomDef, floorCol: number, wallCol: number, trimCol: number, floorMetal = 0.2) {
  const W = room.hw * 2 + 1.2;
  const zc = (room.z0 + room.z1) / 2;
  const D = room.z1 - room.z0 + 1.6;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std(floorCol, 0.35, floorMetal));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, zc);
  g.add(floor);
  const wm = new THREE.MeshStandardMaterial({ color: wallCol, roughness: 0.9, side: THREE.FrontSide });
  const north = room.z0 - 0.8;
  const south = room.z1 + 0.8;
  const hw = room.hw + 0.6;
  wall(g, W, 5, 0, 2.5, north, 0, wm);
  wall(g, D, 5, -hw, 2.5, zc, Math.PI / 2, wm);
  wall(g, D, 5, hw, 2.5, zc, -Math.PI / 2, wm);
  wall(g, W, 5, 0, 2.5, south, Math.PI, wm);
  const trim = glow(trimCol);
  bx(g, W, 0.06, 0.06, 0, 0.05, north + 0.05, trim);
  bx(g, 0.06, 0.06, D, -hw + 0.05, 0.05, zc, trim);
  bx(g, 0.06, 0.06, D, hw - 0.05, 0.05, zc, trim);
  bx(g, W, 0.06, 0.06, 0, 0.05, south - 0.05, trim);
  return { north, south, hw, zc, W, D };
}

function lights(g: THREE.Group, amb: number, ambI: number, hemiSky: number, hemiGround: number, hemiI: number, dir: number, dirI: number) {
  g.add(new THREE.AmbientLight(amb, ambI), new THREE.HemisphereLight(hemiSky, hemiGround, hemiI));
  const d = new THREE.DirectionalLight(dir, dirI);
  d.position.set(-5, 9, 6);
  g.add(d);
}

export interface RoomCtl {
  update: (t: number, dt: number, level: number, bands: number[]) => void;
  setBoard?: (text: string) => void;
  dispose: () => void;
}

/* ---------- Meeting Hall ---------- */
function buildMeeting(sc: THREE.Scene, room: RoomDef, col: Collider[]): RoomCtl {
  sc.background = new THREE.Color(0x0d1118);
  sc.fog = new THREE.Fog(0x0d1118, 20, 48);
  const g = new THREE.Group();
  g.name = "room-meeting";
  sc.add(g);
  const s = shell(g, room, 0x262b3a, 0x1d2233, room.color);
  lights(g, 0xaab4d8, 1.7, 0xc9d2ff, 0x2a2f3f, 1.0, 0xd6deff, 1.3);
  ([[-3.5, 0], [3.5, 0]] as const).forEach(([x, z]) => {
    const pl = new THREE.PointLight(0xffe0b0, 26, 15, 1.6);
    pl.position.set(x, 3.8, z);
    g.add(pl);
  });
  // carpet + oval table
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(13, 7.4), std(0x1b2133, 0.95));
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.y = 0.012;
  g.add(carpet);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.12, 48), std(0x5a4632, 0.35, 0.15));
  top.scale.set(4.4, 1, 1.5);
  top.position.y = 0.75;
  g.add(top);
  const edge = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.03, 48), glow(room.color));
  edge.scale.set(4.46, 1, 1.56);
  edge.position.y = 0.68;
  g.add(edge);
  cyl(g, 0.5, 0.7, 0.7, 0, 0.35, 0, std(0x14161d, 0.3, 0.6));
  col.push({ x: 0, z: 0, w: 4.4 + 0.3, d: 1.5 + 0.3 });
  // holo disc on the table
  const holo = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.018, 8, 48), glow(room.color, 0.8));
  holo.rotation.x = Math.PI / 2;
  holo.position.y = 1.1;
  g.add(holo);
  const holo2 = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.014, 8, 48), glow(0x9dd0ff, 0.7));
  holo2.position.y = 1.1;
  g.add(holo2);
  // chairs
  const chair = std(0x4a5675, 0.85);
  room.seats.forEach((st) => {
    bx(g, 0.56, 0.08, 0.56, st.x, 0.44, st.z, chair);
    cyl(g, 0.04, 0.04, 0.4, st.x, 0.2, st.z, std(0x14161d, 0.3, 0.6), 8);
    const bk = bx(g, 0.56, 0.62, 0.07, st.x - Math.sin(st.yaw) * 0.3, 0.8, st.z - Math.cos(st.yaw) * 0.3, chair);
    bk.rotation.y = st.yaw;
  });
  // screens (same texture on both) + side glow strips
  const b = room.board || { title: "AGENDA", text: "", accent: room.color };
  const board = makeBoard(b.title, b.text, b.accent);
  screen(g, board.tex, 7.2, 2.7, 0, 3.0, s.north + 0.12, 0, b.accent);
  screen(g, board.tex, 7.2, 2.7, 0, 3.4, s.south - 0.12, Math.PI, b.accent);
  [-6, -2, 2, 6].forEach((z) => {
    bx(g, 0.05, 3.2, 0.14, -s.hw + 0.06, 2.4, z, glow(room.color, 0.7));
    bx(g, 0.05, 3.2, 0.14, s.hw - 0.06, 2.4, z, glow(room.color, 0.7));
  });
  ([[-8.5, -7.6], [-8.5, 7.2], [8.6, 7.2]] as const).forEach(([x, z]) => plant(g, x, z, col));
  return {
    update(t) {
      holo.rotation.z = t * 0.0006;
      holo2.rotation.x = t * 0.0008;
      holo2.rotation.y = t * 0.0005;
      holo.position.y = 1.1 + Math.sin(t * 0.002) * 0.04;
    },
    setBoard: board.set,
    dispose() {
      board.tex.dispose();
      disposeTree(sc, g);
    },
  };
}

/* ---------- Party Hall ---------- */
function buildParty(sc: THREE.Scene, room: RoomDef, col: Collider[]): RoomCtl {
  sc.background = new THREE.Color(0x0a0612);
  sc.fog = new THREE.Fog(0x0a0612, 16, 40);
  const g = new THREE.Group();
  g.name = "room-party";
  sc.add(g);
  const s = shell(g, room, 0x14101f, 0x181028, room.color, 0.5);
  lights(g, 0x8a7cc0, 1.0, 0xb8a8ff, 0x1a1030, 0.7, 0xd0c0ff, 0.6);
  const cols = [0xff3ec8, 0x3ec8ff, 0x9dff3e];
  const pls = cols.map((c) => {
    const pl = new THREE.PointLight(c, 42, 15, 1.6);
    pl.position.set(0, 3.6, 1);
    g.add(pl);
    return pl;
  });
  // dance floor: 6x6 colour tiles in one instanced mesh
  const N = 6, TS = 1.25;
  const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(TS - 0.08, 0.05, TS - 0.08), new THREE.MeshBasicMaterial(), N * N);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) {
      m4.setPosition((i - (N - 1) / 2) * TS, 0.03, 1 + (j - (N - 1) / 2) * TS);
      tiles.setMatrixAt(i * N + j, m4);
      tiles.setColorAt(i * N + j, new THREE.Color(0x222233));
    }
  g.add(tiles);
  // DJ booth + stage decal
  const stage = new THREE.Mesh(new THREE.CircleGeometry(2.2, 40), std(0x1c1430, 0.4, 0.4));
  stage.rotation.x = -Math.PI / 2;
  stage.position.set(0, 0.015, -5.2);
  g.add(stage);
  bx(g, 5, 1.1, 0.9, 0, 0.55, -7.2, std(0x1a1030, 0.35, 0.5), col);
  bx(g, 5.1, 0.05, 0.95, 0, 1.12, -7.2, glow(room.color));
  bx(g, 3.2, 1.4, 0.06, 0, 2.6, -7.9, glow(0x3ec8ff, 0.5));
  const decks = [-1.2, 1.2].map((x) => {
    const d = cyl(g, 0.42, 0.42, 0.05, x, 1.17, -7.2, glow(0xffffff, 0.35), 28);
    return d;
  });
  // disco ball, light cones, truss
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), new THREE.MeshStandardMaterial({ color: 0xdfe6ff, roughness: 0.15, metalness: 0.9, flatShading: true }));
  ball.position.set(0, 4.1, 1);
  g.add(ball);
  cyl(g, 0.01, 0.01, 1.2, 0, 4.9, 1, std(0x888888), 4);
  const cones = cols.concat([0xffd34d, 0xc45cff, 0x5ef2c8]).map((c, i) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.55, 4.2, 20, 1, true), glow(c, 0.1));
    cone.position.set(Math.cos(i) * 3.2, 2.7, 1 + Math.sin(i) * 2.4);
    cone.rotation.z = Math.PI;
    g.add(cone);
    return cone;
  });
  bx(g, 15, 0.12, 0.12, 0, 4.7, -2.6, std(0x222233, 0.4, 0.7));
  bx(g, 15, 0.12, 0.12, 0, 4.7, 5, std(0x222233, 0.4, 0.7));
  // speakers
  const speakers = ([[-9.1, -5.8], [9.1, -5.8]] as const).map(([x, z]) => {
    bx(g, 1.1, 2.2, 1.0, x, 1.1, z, std(0x0f0b1a, 0.5, 0.4), col);
    const w1 = cyl(g, 0.38, 0.38, 0.1, x + (x < 0 ? 0.56 : -0.56), 0.6, z, glow(room.color, 0.6), 24);
    w1.rotation.z = Math.PI / 2;
    const w2 = cyl(g, 0.22, 0.22, 0.1, x + (x < 0 ? 0.56 : -0.56), 1.6, z, glow(0x3ec8ff, 0.6), 24);
    w2.rotation.z = Math.PI / 2;
    return [w1, w2];
  });
  // juice bar (east) + couches (west)
  bx(g, 1.2, 1.1, 6, 8.6, 0.55, 2.5, std(0x1a1030, 0.35, 0.5), col);
  bx(g, 1.25, 0.05, 6.05, 8.6, 1.12, 2.5, glow(0xff5ac8));
  bx(g, 0.3, 2.4, 6, 9.9, 1.6, 2.5, glow(0x3ec8ff, 0.35));
  [0.5, 2.5, 4.5].forEach((z) => cyl(g, 0.25, 0.25, 0.7, 7.5, 0.35, z, std(0x2a2f3f, 0.4, 0.5), 14));
  const sofa = std(0x6a3f8a, 0.85);
  ([[-8.4, 0.5], [-8.4, 4.5]] as const).forEach(([x, z]) => {
    bx(g, 1.0, 0.5, 2.2, x, 0.25, z, sofa, col);
    bx(g, 0.3, 0.9, 2.2, x - 0.45, 0.7, z, sofa);
  });
  bx(g, 0.9, 0.35, 0.9, -7.0, 0.18, 2.5, std(0x14101f, 0.3, 0.6), col);
  // neon sign on the north wall
  const sg = makeBoard("PARTY HALL", "Dance. Chat. Celebrate.", room.color);
  screen(g, sg.tex, 4.6, 1.7, 0, 3.6, s.north + 0.12, 0, room.color);
  const c = new THREE.Color();
  return {
    update(t, _dt, level, bands) {
      const k = Math.min(1, level * 1.4);
      for (let i = 0; i < N; i++)
        for (let j = 0; j < N; j++) {
          const b = bands.length ? bands[(i * N + j) % bands.length] || 0 : 0;
          const h = ((t * 0.00012 + (i + j) * 0.07) % 1 + 1) % 1;
          c.setHSL(h, 0.9, 0.18 + 0.4 * Math.max(b, k * 0.5) + (Math.sin(t * 0.004 + i * 1.3 + j) + 1) * 0.04);
          tiles.setColorAt(i * N + j, c);
        }
      if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
      ball.rotation.y = t * 0.0008;
      pls.forEach((p, i) => {
        const a = t * 0.0007 + (i * Math.PI * 2) / 3;
        p.position.set(Math.cos(a) * 4.5, 3.4, 1 + Math.sin(a) * 3.2);
        p.intensity = 34 + k * 46;
      });
      cones.forEach((cn, i) => {
        cn.rotation.x = Math.sin(t * 0.0009 + i) * 0.5;
        cn.rotation.y = t * 0.0004 * (i % 2 ? 1 : -1);
        (cn.material as THREE.MeshBasicMaterial).opacity = 0.07 + k * 0.1;
      });
      speakers.forEach(([a, b]) => {
        a.scale.set(1 + k * 0.35, 1, 1 + k * 0.35);
        b.scale.set(1 + k * 0.25, 1, 1 + k * 0.25);
      });
      decks.forEach((d, i) => (d.rotation.y = t * 0.002 * (i ? -1 : 1)));
    },
    dispose() {
      sg.tex.dispose();
      tiles.dispose();
      disposeTree(sc, g);
    },
  };
}

/* ---------- AI Lab ---------- */
function codeTexture(seed: number) {
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 160;
  const cx = cv.getContext("2d");
  const tex = new THREE.CanvasTexture(cv);
  if (cx) {
    cx.fillStyle = "#06121c";
    cx.fillRect(0, 0, 256, 160);
    let r = seed;
    const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
    for (let y = 12; y < 150; y += 12) {
      let x = 10 + Math.floor(rnd() * 3) * 10;
      const n = 2 + Math.floor(rnd() * 4);
      for (let k = 0; k < n; k++) {
        const w = 14 + Math.floor(rnd() * 46);
        cx.fillStyle = ["#5ef2c8", "#6bb5ff", "#c45cff", "#ffd34d"][Math.floor(rnd() * 4)];
        cx.fillRect(x, y, w, 5);
        x += w + 6;
      }
    }
  }
  return tex;
}

function buildLab(sc: THREE.Scene, room: RoomDef, col: Collider[]): RoomCtl {
  sc.background = new THREE.Color(0x050b14);
  sc.fog = new THREE.Fog(0x050b14, 16, 42);
  const g = new THREE.Group();
  g.name = "room-lab";
  sc.add(g);
  const s = shell(g, room, 0x0a1320, 0x0c1626, room.color, 0.5);
  lights(g, 0x7fa8ff, 1.3, 0x9fc0ff, 0x0a1320, 0.8, 0xbfd4ff, 0.7);
  const L1 = new THREE.PointLight(0x5ef2c8, 30, 14, 1.6);
  L1.position.set(0, 4, -1.5);
  const L2 = new THREE.PointLight(0xa66bff, 24, 14, 1.6);
  L2.position.set(-6, 3.4, 4);
  const L3 = new THREE.PointLight(0x3ec8ff, 24, 14, 1.6);
  L3.position.set(6, 3.4, 4);
  g.add(L1, L2, L3);
  const grid = new THREE.GridHelper(s.W - 1, 18, 0x2de2ff, 0x16405a);
  grid.position.set(0, 0.012, s.zc);
  grid.scale.z = (s.D - 1) / (s.W - 1);
  const gm = grid.material as THREE.LineBasicMaterial;
  gm.transparent = true;
  gm.opacity = 0.45;
  g.add(grid);
  // core pedestal ring
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.0, 2.15, 64), glow(room.color, 0.8));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.02, -1.5);
  g.add(ring);
  // holographic neural network over the core
  const net = new THREE.Group();
  net.position.set(0, 3.7, -1.5);
  g.add(net);
  const P: THREE.Vector3[] = [];
  const NN = 30;
  for (let i = 0; i < NN; i++) {
    const y = 1 - (i / (NN - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = i * 2.399963;
    P.push(new THREE.Vector3(Math.cos(th) * r * 1.35, y * 1.1, Math.sin(th) * r * 1.35));
  }
  const nodeGeo = new THREE.SphereGeometry(0.07, 10, 8);
  const nodeMat = glow(0x9dfce6);
  P.forEach((p) => {
    const n = new THREE.Mesh(nodeGeo, nodeMat);
    n.position.copy(p);
    net.add(n);
  });
  const edges: [number, number][] = [];
  const ev: number[] = [];
  for (let i = 0; i < NN; i++)
    for (let j = i + 1; j < NN; j++)
      if (P[i].distanceTo(P[j]) < 1.05) {
        edges.push([i, j]);
        ev.push(P[i].x, P[i].y, P[i].z, P[j].x, P[j].y, P[j].z);
      }
  const eg = new THREE.BufferGeometry();
  eg.setAttribute("position", new THREE.Float32BufferAttribute(ev, 3));
  const lm = new THREE.LineBasicMaterial({ color: 0x5ef2c8, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending });
  net.add(new THREE.LineSegments(eg, lm));
  const pktGeo = new THREE.SphereGeometry(0.06, 8, 6);
  const pktMat = glow(0xffffff);
  const pk = Array.from({ length: 16 }, (_, i) => {
    const m = new THREE.Mesh(pktGeo, pktMat);
    net.add(m);
    return { m, e: Math.floor(Math.random() * edges.length), p: Math.random(), v: 0.5 + (i % 4) * 0.2 };
  });
  const rings = [1.7, 2.0].map((r, i) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 6, 80), glow(i ? 0xa66bff : room.color, 0.7));
    net.add(t);
    return t;
  });
  // prompt wall
  const b = room.board || { title: "PROMPT WALL", text: "", accent: room.color };
  const board = makeBoard(b.title, b.text, b.accent);
  screen(g, board.tex, 8.2, 3.07, 0, 3.0, s.north + 0.12, 0, b.accent);
  // workstations (east)
  const desk = std(0x16263a, 0.4, 0.5);
  const codes = [codeTexture(3), codeTexture(11), codeTexture(29)];
  room.seats.forEach((st, i) => {
    bx(g, 1.1, 0.07, 2.0, 8.5, 0.76, st.z, desk, col);
    bx(g, 0.08, 0.76, 1.8, 8.5, 0.38, st.z, std(0x0f1a28, 0.4, 0.5));
    bx(g, 0.1, 0.35, 0.1, 8.8, 1.0, st.z, std(0x14161d, 0.3, 0.6));
    const sc2 = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.85), new THREE.MeshBasicMaterial({ map: codes[i % 3], toneMapped: false }));
    sc2.position.set(8.74, 1.42, st.z);
    sc2.rotation.y = -Math.PI / 2;
    g.add(sc2);
    bx(g, 0.06, 0.9, 1.55, 8.78, 1.42, st.z, std(0x0a0d16, 0.4, 0.6));
    bx(g, 0.5, 0.08, 0.5, st.x, 0.44, st.z, std(0x2a3a55, 0.8));
    bx(g, 0.07, 0.6, 0.5, st.x - 0.27, 0.78, st.z, std(0x2a3a55, 0.8));
  });
  // server racks (west) with blinking light strips
  const rackMat = std(0x0b1018, 0.4, 0.6);
  const strips: THREE.Mesh[] = [];
  [-6, -4.2, -2.4, -0.6, 1.2, 3].forEach((z, i) => {
    bx(g, 0.9, 2.6, 1.2, -8.4, 1.3, z, rackMat, col);
    for (let k = 0; k < 5; k++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 0.9), glow([0x5ef2c8, 0x3ec8ff, 0xa66bff][(i + k) % 3], 0.85));
      m.position.set(-7.93, 0.5 + k * 0.42, z);
      g.add(m);
      strips.push(m);
    }
  });
  // glowing pillars
  ([[-8.9, -7.6], [8.9, -7.6], [-8.9, 7.2], [8.9, 7.2]] as const).forEach(([x, z]) => cyl(g, 0.12, 0.12, 4.6, x, 2.3, z, glow(room.color, 0.55), 10));
  return {
    update(t, dt) {
      net.rotation.y = t * 0.00022;
      rings[0].rotation.set(t * 0.0004, t * 0.0003, 0);
      rings[1].rotation.set(Math.PI / 3, t * -0.0005, t * 0.0002);
      pk.forEach((p) => {
        p.p += dt * p.v;
        if (p.p >= 1 || !edges.length) {
          p.p = 0;
          p.e = Math.floor(Math.random() * Math.max(1, edges.length));
        }
        const e = edges[p.e];
        if (e) p.m.position.lerpVectors(P[e[0]], P[e[1]], p.p);
      });
      strips.forEach((m, i) => ((m.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.55 * Math.abs(Math.sin(t * 0.003 + i * 1.7))));
    },
    setBoard: board.set,
    dispose() {
      board.tex.dispose();
      codes.forEach((c) => c.dispose());
      eg.dispose();
      disposeTree(sc, g);
    },
  };
}

/* ---------- Cosmos Deck ---------- */
function buildCosmos(sc: THREE.Scene, room: RoomDef, _col: Collider[]): RoomCtl {
  void _col;
  sc.background = new THREE.Color(0x03040c);
  sc.fog = new THREE.Fog(0x03040c, 40, 120);
  const g = new THREE.Group();
  g.name = "room-cosmos";
  sc.add(g);
  lights(g, 0x8090ff, 1.1, 0xa8b8ff, 0x0a0820, 0.8, 0xc8d0ff, 1.1);
  const pl = new THREE.PointLight(0xa66bff, 30, 14, 1.6);
  pl.position.set(0, 3.4, -2.6);
  g.add(pl);
  // glass deck with a glowing grid
  const W = room.hw * 2 + 1.6;
  const D = room.z1 - room.z0 + 1.6;
  const zc = (room.z0 + room.z1) / 2;
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std(0x0b0d1c, 0.25, 0.6));
  deck.rotation.x = -Math.PI / 2;
  deck.position.set(0, 0, zc);
  g.add(deck);
  const grid = new THREE.GridHelper(W - 1, 16, 0xa66bff, 0x2a2060);
  grid.position.set(0, 0.012, zc);
  grid.scale.z = (D - 1) / (W - 1);
  const gm = grid.material as THREE.LineBasicMaterial;
  gm.transparent = true;
  gm.opacity = 0.5;
  g.add(grid);
  // glowing rails around the edge (the walkable area stops at the rail)
  const rail = glow(room.color, 0.9);
  bx(g, W, 0.9, 0.06, 0, 0.45, room.z0 - 0.7, glow(room.color, 0.12));
  bx(g, W, 0.06, 0.06, 0, 0.92, room.z0 - 0.7, rail);
  bx(g, 0.06, 0.06, D, -W / 2 + 0.05, 0.92, zc, rail);
  bx(g, 0.06, 0.06, D, W / 2 - 0.05, 0.92, zc, rail);
  bx(g, W, 0.06, 0.06, 0, 0.92, room.z1 + 0.7, rail);
  // planet, atmosphere, rings, moon
  const planet = new THREE.Group();
  planet.position.set(-8, 5, -42);
  g.add(planet);
  const body = new THREE.Mesh(new THREE.SphereGeometry(16, 48, 32), new THREE.MeshStandardMaterial({ color: 0x2f5bff, emissive: 0x0a1650, roughness: 0.8 }));
  planet.add(body);
  const bands = new THREE.Mesh(new THREE.SphereGeometry(16.05, 48, 32), new THREE.MeshBasicMaterial({ color: 0xa66bff, wireframe: true, transparent: true, opacity: 0.08 }));
  planet.add(bands);
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(17.4, 32, 24), new THREE.MeshBasicMaterial({ color: 0x6bb5ff, transparent: true, opacity: 0.16, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  planet.add(atmo);
  const prings = new THREE.Mesh(new THREE.RingGeometry(22, 30, 80), new THREE.MeshBasicMaterial({ color: 0xc8b0ff, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
  prings.rotation.x = Math.PI / 2.3;
  planet.add(prings);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(3.2, 24, 16), std(0xcfd4e8, 0.9));
  moon.position.set(26, 9, -30);
  g.add(moon);
  // stars
  const NS = 700;
  const sp = new Float32Array(NS * 3);
  for (let i = 0; i < NS; i++) {
    const a = Math.random() * Math.PI * 2;
    const el = Math.random() * 1.2 - 0.1;
    const r = 70 + Math.random() * 20;
    sp[i * 3] = Math.cos(a) * r * Math.cos(el);
    sp[i * 3 + 1] = Math.sin(el) * r * 0.7 + 8;
    sp[i * 3 + 2] = Math.sin(a) * r * Math.cos(el);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, sizeAttenuation: true, fog: false, transparent: true, opacity: 0.9 }));
  g.add(stars);
  // asteroid belt
  const rockGeo = new THREE.DodecahedronGeometry(0.6, 0);
  const belt = new THREE.InstancedMesh(rockGeo, std(0x6a6f88, 0.9), 60);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const r = 24 + Math.random() * 6;
    const sc2 = 0.4 + Math.random() * 1.2;
    q.setFromEuler(new THREE.Euler(Math.random() * 3, Math.random() * 3, 0));
    m4.compose(new THREE.Vector3(Math.cos(a) * r, (Math.random() - 0.5) * 1.5, Math.sin(a) * r), q, new THREE.Vector3(sc2, sc2, sc2));
    belt.setMatrixAt(i, m4);
  }
  belt.rotation.x = Math.PI / 2.3;
  planet.add(belt);
  // floating rings over the deck
  const floats = [2.6, 3.4, 4.2].map((y, i) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(2.6 + i * 1.3, 0.025, 8, 80), glow([0xa66bff, 0x5ef2c8, 0x6bb5ff][i], 0.7));
    t.position.set(0, y, -2.6);
    g.add(t);
    return t;
  });
  // benches
  const bench = std(0x1d2240, 0.6, 0.3);
  ([-2.7, 2.7] as const).forEach((x) => {
    bx(g, 3.6, 0.1, 0.7, x, 0.44, 3.3, bench);
    bx(g, 3.6, 0.5, 0.08, x, 0.75, 3.7, bench);
    bx(g, 3.6, 0.04, 0.74, x, 0.4, 3.3, glow(room.color, 0.8));
  });
  return {
    update(t) {
      planet.rotation.y = t * 0.00004;
      belt.rotation.z = t * 0.00012;
      moon.position.x = 26 + Math.sin(t * 0.0002) * 2;
      floats.forEach((f, i) => {
        f.rotation.x = Math.PI / 2 + Math.sin(t * 0.0006 + i) * 0.35;
        f.rotation.y = t * 0.0004 * (i % 2 ? -1 : 1);
      });
      stars.rotation.y = t * 0.00001;
    },
    dispose() {
      sg.dispose();
      belt.dispose();
      disposeTree(sc, g);
    },
  };
}

function disposeTree(sc: THREE.Scene, g: THREE.Object3D) {
  sc.remove(g);
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose();
  });
}

/** Builds the 3D set for a non-lounge world. Fills `col` with things you can't walk through. */
export function buildRoom(sc: THREE.Scene, room: RoomDef, col: Collider[]): RoomCtl {
  if (room.id === "meeting") return buildMeeting(sc, room, col);
  if (room.id === "party") return buildParty(sc, room, col);
  if (room.id === "cosmos") return buildCosmos(sc, room, col);
  return buildLab(sc, room, col);
}

/* ---------- portals (every world) ---------- */
export function addPortals(sc: THREE.Scene, room: RoomDef) {
  const g = new THREE.Group();
  g.name = "portals";
  sc.add(g);
  const parts = room.portals.map((p) => {
    const col = getRoom(p.to).color;
    const grp = new THREE.Group();
    grp.position.set(p.x, 0, p.z);
    grp.rotation.y = p.face;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.07, 10, 48), glow(col));
    ring.position.y = 1.2;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.0, 40), glow(col, 0.22));
    disc.position.y = 1.2;
    disc.material.side = THREE.DoubleSide;
    const inner = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.02, 6, 40), glow(0xffffff, 0.7));
    inner.position.y = 1.2;
    const pad = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.05, 40), glow(col, 0.5));
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.03;
    grp.add(ring, disc, inner, pad);
    g.add(grp);
    return { disc, inner, pad };
  });
  return {
    update(t: number) {
      parts.forEach((p, i) => {
        (p.disc.material as THREE.MeshBasicMaterial).opacity = 0.16 + 0.1 * Math.sin(t * 0.003 + i);
        p.inner.rotation.z = t * 0.0015;
        (p.pad.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.2 * Math.sin(t * 0.004 + i);
      });
    },
    dispose: () => disposeTree(sc, g),
  };
}

/* ---------- huddle circles (private talk areas) ---------- */
export function addHuddles(sc: THREE.Scene, room: RoomDef) {
  const g = new THREE.Group();
  g.name = "huddles";
  sc.add(g);
  const c = 0x7fe8c8;
  const parts = room.huddles.map((h) => {
    const grp = new THREE.Group();
    grp.position.set(h.x, 0, h.z);
    const ring = new THREE.Mesh(new THREE.RingGeometry(h.r - 0.1, h.r, 56), glow(c, 0.7));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.035;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(h.r - 0.1, 48), glow(c, 0.06));
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.03;
    const spin = new THREE.Mesh(new THREE.TorusGeometry(h.r - 0.35, 0.012, 6, 64), glow(0xffffff, 0.45));
    spin.rotation.x = Math.PI / 2;
    spin.position.y = 0.06;
    grp.add(ring, disc, spin);
    g.add(grp);
    return { ring, disc, spin };
  });
  return {
    /** `active` = index of the circle I'm standing in (or -1). */
    update(t: number, active: number) {
      parts.forEach((p, i) => {
        const on = i === active;
        (p.disc.material as THREE.MeshBasicMaterial).opacity = on ? 0.2 + 0.05 * Math.sin(t * 0.005) : 0.06;
        (p.ring.material as THREE.MeshBasicMaterial).opacity = on ? 1 : 0.55;
        p.spin.rotation.z = t * 0.0008;
      });
    },
    dispose: () => disposeTree(sc, g),
  };
}
