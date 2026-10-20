import * as THREE from "three";

/** A point in the lounge that can be linked: a person or a "thing" (orb, zone). */
export interface LinkNode {
  id: string;
  x: number;
  z: number;
  kind: "me" | "peer" | "thing";
}

const MAX = 14; // hard cap on live links, keeps phones smooth
const SEG = 20; // points per curved beam
const PEOPLE_RANGE = 6; // people closer than this are "connected"
const THING_RANGE = 2.8; // a person this close to a thing is linked to it
const Y = 1.3; // beam height (about chest/head)

interface Slot {
  line: THREE.Line;
  pulse: THREE.Mesh;
  pos: Float32Array;
  key: string | null;
  alpha: number;
  target: number;
  a: THREE.Vector3;
  b: THREE.Vector3;
  phase: number;
}

const COL = { me: new THREE.Color(0xc8a26b), peer: new THREE.Color(0x7fb59a), thing: new THREE.Color(0x8fb4ff) };

/**
 * Connection web: soft glowing arcs with a travelling light pulse between people
 * who are near each other, and between people and things (Lumen Orb, zones) they
 * stand close to. Purely visual and additive: nothing in the lounge is changed,
 * and the world calls it inside try/catch so it can never break movement.
 */
export function addConnect(sc: THREE.Scene) {
  const g = new THREE.Group();
  g.name = "connect";
  sc.add(g);
  const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pulseGeo = new THREE.SphereGeometry(0.06, 10, 8);
  const slots: Slot[] = [];
  for (let i = 0; i < MAX; i++) {
    const pos = new Float32Array(SEG * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const line = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    line.frustumCulled = false;
    line.visible = false;
    const pulse = new THREE.Mesh(
      pulseGeo,
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    pulse.visible = false;
    g.add(line, pulse);
    slots.push({ line, pulse, pos, key: null, alpha: 0, target: 0, a: new THREE.Vector3(), b: new THREE.Vector3(), phase: Math.random() });
  }

  const tmp = new THREE.Vector3();

  function update(t: number, dt: number, nodes: LinkNode[]) {
    // 1. work out which links should exist right now
    const want = new Map<string, { a: LinkNode; b: LinkNode; d: number }>();
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i],
          b = nodes[j];
        if (a.kind === "thing" && b.kind === "thing") continue;
        const d = Math.hypot(a.x - b.x, a.z - b.z);
        const lim = a.kind === "thing" || b.kind === "thing" ? THING_RANGE : PEOPLE_RANGE;
        if (d < lim && d > 0.6) want.set(a.id < b.id ? a.id + "|" + b.id : b.id + "|" + a.id, { a, b, d });
      }
    }
    // 2. update links already showing, fade the ones that are gone
    const k = Math.min(1, 6 * dt);
    for (const s of slots) {
      if (!s.key) continue;
      const w = want.get(s.key);
      if (w) {
        s.a.set(w.a.x, Y, w.a.z);
        s.b.set(w.b.x, Y, w.b.z);
        s.target = 1;
        want.delete(s.key);
      } else s.target = 0;
      s.alpha += (s.target - s.alpha) * k;
      if (s.target === 0 && s.alpha < 0.03) {
        s.key = null;
        s.alpha = 0;
        s.line.visible = false;
        s.pulse.visible = false;
      }
    }
    // 3. give new links a free slot, nearest first
    const fresh = [...want.entries()].sort((p, q) => p[1].d - q[1].d);
    for (const [key, w] of fresh) {
      const s = slots.find((x) => !x.key);
      if (!s) break;
      s.key = key;
      s.alpha = 0;
      s.target = 1;
      s.a.set(w.a.x, Y, w.a.z);
      s.b.set(w.b.x, Y, w.b.z);
      const c = w.a.kind === "me" || w.b.kind === "me" ? COL.me : w.a.kind === "thing" || w.b.kind === "thing" ? COL.thing : COL.peer;
      (s.line.material as THREE.LineBasicMaterial).color.copy(c);
      (s.pulse.material as THREE.MeshBasicMaterial).color.copy(c);
      s.line.visible = true;
      s.pulse.visible = true;
    }
    // 4. draw every live link as a lifted arc with a travelling pulse
    for (const s of slots) {
      if (!s.key) continue;
      const len = s.a.distanceTo(s.b);
      const arc = 0.22 + len * 0.07;
      for (let i = 0; i < SEG; i++) {
        const u = i / (SEG - 1);
        tmp.lerpVectors(s.a, s.b, u);
        const sag = Math.sin(Math.PI * u) * arc + (reduce ? 0 : Math.sin(t * 0.003 + u * 5 + s.phase * 6) * 0.03 * Math.sin(Math.PI * u));
        s.pos[i * 3] = tmp.x;
        s.pos[i * 3 + 1] = tmp.y + sag;
        s.pos[i * 3 + 2] = tmp.z;
      }
      (s.line.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (s.line.material as THREE.LineBasicMaterial).opacity = 0.5 * s.alpha;
      const u = reduce ? 0.5 : (t * 0.0005 + s.phase) % 1;
      tmp.lerpVectors(s.a, s.b, u);
      s.pulse.position.set(tmp.x, tmp.y + Math.sin(Math.PI * u) * arc, tmp.z);
      s.pulse.scale.setScalar(0.8 + Math.sin(Math.PI * u) * 0.8);
      (s.pulse.material as THREE.MeshBasicMaterial).opacity = 0.9 * s.alpha;
    }
  }

  function dispose() {
    sc.remove(g);
    pulseGeo.dispose();
    slots.forEach((s) => {
      s.line.geometry.dispose();
      (s.line.material as THREE.Material).dispose();
      (s.pulse.material as THREE.Material).dispose();
    });
  }

  return { update, dispose };
}
