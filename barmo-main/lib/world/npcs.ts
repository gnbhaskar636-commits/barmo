import * as THREE from "three";
import { makeAvatar, type AvatarConfig } from "@/lib/world/avatar";
import type { RoomId } from "@/lib/world/rooms";
import type { Collider } from "@/lib/world/lounge";
import type { Mood } from "@/lib/world/scenes";
import { makeCup, disposeCup, MENUS } from "@/lib/world/drinks";

/**
 * The crew who live in the worlds: bartenders, dancers and the AI lab team.
 * They are simulated locally from the clock (no network), so everyone sees them doing roughly the same thing.
 */
export type NpcKind = "bartender" | "dancer" | "scientist" | "tech" | "astronaut";
export interface NpcDef {
  id: string;
  name: string;
  title: string;
  room: RoomId;
  kind: NpcKind;
  x: number;
  z: number;
  yaw: number;
  cfg: Partial<AvatarConfig>;
  path?: [number, number][];
  menu?: "cafe" | "party";
  lines: string[];
}

const PI = Math.PI;
export const NPCS: NpcDef[] = [
  {
    id: "marco", name: "Marco", title: "Barista", room: "lounge", kind: "bartender", x: -6, z: -7.1, yaw: 0, menu: "cafe",
    cfg: { skin: 0xc68e66, hair: 0x1b1512, hs: "short", fit: "suit", top: 0x23252e, bottom: 0x23252e, trim: 0xc8a26b, face: "smile", build: 1.06, h: 1.03 },
    lines: ["Welcome to the coffee bar. What can I get you?", "Slow day or busy day? Either way, coffee helps.", "I make the best flat white in any world."],
  },
  {
    id: "lena", name: "Lena", title: "Juice bar", room: "party", kind: "bartender", x: 9.52, z: 2.5, yaw: -PI / 2, menu: "party",
    cfg: { skin: 0xf1d0b3, hair: 0xb5651d, hs: "bun", fit: "tee", top: 0x14101f, bottom: 0x23252e, trim: 0xff5ac8, face: "smile", h: 0.97, sh: 0.92 },
    lines: ["Hey! Thirsty? Everything here is zero-alcohol.", "The berry fizz is the crowd favourite tonight.", "Grab a drink and hit the dance floor!"],
  },
  { id: "zoe", name: "Zoe", title: "Dancer", room: "party", kind: "dancer", x: -2.2, z: 0.2, yaw: PI, cfg: { skin: 0x8d5a3b, hair: 0x1b1512, hs: "long", fit: "tee", top: 0xff5ac8, bottom: 0x2f3a5a, trim: 0xffffff, face: "smile", h: 0.97, sh: 0.9 }, lines: ["Come dance with me!", "This song is unreal."] },
  { id: "dev", name: "Dev", title: "Dancer", room: "party", kind: "dancer", x: 2.4, z: 1.0, yaw: PI, cfg: { skin: 0xc68e66, hair: 0x1b1512, hs: "spiky", fit: "jacket", top: 0x3ec8ff, bottom: 0x23252e, trim: 0xffd34d, face: "cool", build: 1.1 }, lines: ["Watch this move.", "Pick a better song and I'll show you more."] },
  { id: "mia", name: "Mia", title: "Dancer", room: "party", kind: "dancer", x: -0.8, z: 3.1, yaw: PI, cfg: { skin: 0xf1d0b3, hair: 0x6b5bd6, hs: "curly", fit: "hoodie", top: 0x9dff3e, bottom: 0x3b4258, trim: 0x23252e, face: "wow", h: 0.95 }, lines: ["I could dance all night.", "Is that the techno track? Yes please."] },
  { id: "kai", name: "Kai", title: "Dancer", room: "party", kind: "dancer", x: 1.6, z: 3.4, yaw: PI, cfg: { skin: 0xe0b894, hair: 0x2b2118, hs: "short", fit: "suit", top: 0x6a3f8a, bottom: 0x23252e, trim: 0xc8a26b, face: "smile", h: 1.04 }, lines: ["Nice to meet you. Let's dance.", "Hold on, my favourite part is coming."] },
  {
    id: "nova", name: "Dr. Nova", title: "AI scientist", room: "lab", kind: "scientist", x: -3.4, z: -4.6, yaw: PI / 2,
    path: [[-3.4, -4.6], [3.4, -4.6]],
    cfg: { skin: 0x8d5a3b, hair: 0x1b1512, hs: "bun", fit: "jacket", top: 0xece8df, bottom: 0x23252e, trim: 0x5ef2c8, gl: true, face: "calm", sh: 0.94 },
    lines: ["Welcome to the AI Lab. Sit at a workstation and I'll start a class.", "Ask me anything about how AI works.", "The neural core is learning right now, look up."],
  },
  {
    id: "ravi", name: "Ravi", title: "Lab engineer", room: "lab", kind: "tech", x: -7.0, z: -2.4, yaw: -PI / 2,
    cfg: { skin: 0xc68e66, hair: 0x1b1512, hs: "short", fit: "hoodie", top: 0x3b3f4a, bottom: 0x23252e, trim: 0x5ef2c8, gl: true, face: "calm" },
    lines: ["These racks train the models. Loud, but worth it.", "The workstations run live demos. Sit down and watch.", "GPU temperature is fine. Mostly."],
  },
];

NPCS.push(
  {
    id: "vega", name: "Cmdr. Vega", title: "Astronaut", room: "cosmos", kind: "astronaut", x: -4.5, z: -5.5, yaw: PI / 4,
    cfg: { skin: 0xc68e66, hair: 0x1b1512, hs: "short", fit: "jacket", top: 0xe9edf5, bottom: 0xe9edf5, trim: 0xff8a3d, shoe: 0xb8bcc8, face: "smile", h: 1.02 },
    lines: ["Welcome aboard the deck. Watch the sky: a comet passes every minute or so.", "Floating never gets old. Ask me anything about space.", "Make a wish when the comet crosses. I always do."],
  },
  {
    id: "kit", name: "Astro Kit", title: "Astronaut", room: "cosmos", kind: "astronaut", x: 4.8, z: 0.5, yaw: -PI / 3,
    cfg: { skin: 0xf1d0b3, hair: 0xb5651d, hs: "bun", fit: "jacket", top: 0xe9edf5, bottom: 0xe9edf5, trim: 0x6bb5ff, shoe: 0xb8bcc8, face: "wow", h: 0.96, sh: 0.92 },
    lines: ["No gravity here, but great views.", "Did you know a day on Venus is longer than its year?", "I'm checking the telescope. See that ringed planet?"],
  }
);

export const npcById = (id: string) => NPCS.find((n) => n.id === id) || null;

function label(text: string, sub: string) {
  const cv = document.createElement("canvas");
  cv.width = 384;
  cv.height = 96;
  const cx = cv.getContext("2d")!;
  cx.fillStyle = "rgba(10,12,20,0.72)";
  cx.beginPath();
  cx.roundRect?.(4, 4, 376, 88, 24);
  if (!cx.roundRect) cx.rect(4, 4, 376, 88);
  cx.fill();
  cx.fillStyle = "#ffffff";
  cx.font = "700 34px system-ui, sans-serif";
  cx.textAlign = "center";
  cx.fillText(text, 192, 44);
  cx.fillStyle = "#c8a26b";
  cx.font = "500 24px system-ui, sans-serif";
  cx.fillText(sub, 192, 76);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(1.15, 0.29, 1);
  sp.renderOrder = 5;
  return sp;
}

const lerpAng = (a: number, b: number, k: number) => {
  let d = ((b - a + PI) % (PI * 2)) - PI;
  if (d < -PI) d += PI * 2;
  return a + d * k;
};

interface State { def: NpcDef; g: THREE.Group; ph: number; wp: number; wait: number; cup: THREE.Group | null; sp: THREE.Sprite }

export function addNpcs(scene: THREE.Scene, room: RoomId, col: Collider[]) {
  const defs = NPCS.filter((n) => n.room === room);
  const root = new THREE.Group();
  root.name = "npcs";
  scene.add(root);
  const list: State[] = defs.map((def, i) => {
    const g = makeAvatar(def.cfg);
    g.position.set(def.x, 0, def.z);
    g.rotation.y = def.yaw;
    const sp = label(def.name, def.title);
    sp.position.set(0, (g.userData.top as number) + 0.3, 0);
    g.add(sp);
    let cup: THREE.Group | null = null;
    if (def.kind === "bartender") {
      cup = makeCup(MENUS[def.menu || "cafe"][0]);
      const arms = g.userData.arms as THREE.Group[];
      cup.position.set(0, -0.62, 0.06);
      cup.visible = false;
      arms[1].add(cup);
    }
    if (def.kind === "dancer") col.push({ x: def.x, z: def.z, w: 0.45, d: 0.45 });
    if (def.kind === "astronaut") {
      const top = g.userData.top as number;
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.21, 20, 14), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
      helmet.position.set(0, top - 0.13, 0);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 8, 24), new THREE.MeshStandardMaterial({ color: 0xb8bcc8, roughness: 0.4, metalness: 0.6 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, top - 0.3, 0);
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.46, 0.16), new THREE.MeshStandardMaterial({ color: 0xcdd2de, roughness: 0.5, metalness: 0.3 }));
      pack.position.set(0, top - 0.62, -0.2);
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshBasicMaterial({ color: 0x5ef2c8 }));
      light.position.set(0.08, top - 0.62, 0.17);
      g.add(helmet, ring, pack, light);
    }
    root.add(g);
    return { def, g, ph: i * 1.7, wp: 0, wait: 0, cup, sp };
  });

  return {
    group: root,
    has: list.length > 0,
    /** Closest NPC within `r` metres, for the "Talk" button. */
    near(x: number, z: number, r = 2.1): NpcDef | null {
      let best: NpcDef | null = null;
      let bd = r;
      list.forEach((s) => {
        const d = Math.hypot(s.g.position.x - x, s.g.position.z - z);
        if (d < bd) {
          bd = d;
          best = s.def;
        }
      });
      return best;
    },
    pick(ray: THREE.Raycaster): { id: string; dist: number } | null {
      let best: { id: string; dist: number } | null = null;
      list.forEach((s) => {
        const hit = ray.intersectObject(s.g, true).find((h) => !(h.object as THREE.Sprite).isSprite);
        if (hit && (!best || hit.distance < best.dist)) best = { id: s.def.id, dist: hit.distance };
      });
      return best;
    },
    update(t: number, dt: number, me: THREE.Vector3, mood: Mood) {
      const music = !!mood.scene && !mood.reduce;
      const beat = music ? mood.beat.beat : 0;
      const punch = mood.scene ? mood.scene.punch : 0.4;
      list.forEach((s, idx) => {
        const { g, def } = s;
        const legs = g.userData.legs as THREE.Group[];
        const arms = g.userData.arms as THREE.Group[];
        const eyes = g.userData.eyes as THREE.Object3D[];
        const ph = s.ph;
        if (def.kind === "astronaut") {
          // zero gravity: slow drift, a gentle tumble, limbs floating
          g.position.set(def.x + Math.sin(t * 0.00032 + ph) * 1.4, 0.9 + Math.sin(t * 0.0007 + ph) * 0.25, def.z + Math.cos(t * 0.00027 + ph) * 1.0);
          g.rotation.set(Math.sin(t * 0.0005 + ph) * 0.16, def.yaw + Math.sin(t * 0.0004 + ph) * 1.1, Math.sin(t * 0.0004 + ph * 2) * 0.14);
          arms[0].rotation.set(-0.5 + Math.sin(t * 0.0011 + ph) * 0.35, 0, 0.55 + Math.sin(t * 0.0009) * 0.2);
          arms[1].rotation.set(-0.5 + Math.sin(t * 0.0012 + ph + 1) * 0.35, 0, -0.55 - Math.sin(t * 0.0008) * 0.2);
          legs[0].rotation.x = 0.25 + Math.sin(t * 0.0008 + ph) * 0.2;
          legs[1].rotation.x = 0.15 + Math.sin(t * 0.0009 + ph + 2) * 0.2;
          return;
        }
        let moving = false;
        let wantYaw = g.rotation.y;
        const dxm = me.x - g.position.x;
        const dzm = me.z - g.position.z;
        const nearMe = Math.hypot(dxm, dzm) < 4.2;
        if (nearMe && def.kind !== "dancer") wantYaw = Math.atan2(dxm, dzm);
        let bob = Math.sin(t * 0.002 + ph) * 0.01;
        let rz = 0;
        legs[0].rotation.x = legs[1].rotation.x = 0;
        arms[0].rotation.set(0.05, 0, 0.05);
        arms[1].rotation.set(0.05, 0, -0.05);

        if (def.kind === "bartender") {
          const c = ((t * 0.001 + ph) % 16);
          if (c < 5) {
            // polishing a glass
            arms[0].rotation.set(-0.9, 0, 0.25);
            arms[1].rotation.set(-1.0 + Math.sin(t * 0.008) * 0.12, 0, -0.3);
            if (s.cup) s.cup.visible = true;
          } else if (c < 9) {
            arms[0].rotation.set(-0.35, 0, 0.1);
            arms[1].rotation.set(-0.35, 0, -0.1);
            if (s.cup) s.cup.visible = false;
          } else if (c < 12) {
            // shaking a drink
            const k = Math.sin(t * 0.03) * 0.3;
            arms[0].rotation.set(-1.5 + k, 0, 0.2);
            arms[1].rotation.set(-1.5 - k, 0, -0.2);
            bob += Math.abs(k) * 0.02;
            if (s.cup) s.cup.visible = false;
          } else {
            // wiping the counter
            arms[1].rotation.set(-1.15, 0, -0.1 + Math.sin(t * 0.006) * 0.35);
            arms[0].rotation.set(-0.3, 0, 0.1);
            if (s.cup) s.cup.visible = false;
          }
        } else if (def.kind === "dancer") {
          const st = idx % 3;
          if (music) {
            const sp = 0.006 + punch * 0.004;
            bob = Math.abs(Math.sin(t * sp + ph)) * 0.05 + beat * 0.07 * punch;
            rz = Math.sin(t * 0.0035 + ph) * 0.07;
            legs[0].rotation.x = Math.sin(t * sp + ph) * 0.4;
            legs[1].rotation.x = -Math.sin(t * sp + ph) * 0.4;
            if (st === 0) {
              arms[0].rotation.set(0, 0, -(2.2 + Math.sin(t * sp + ph) * 0.4));
              arms[1].rotation.set(0, 0, 2.2 + Math.sin(t * sp + ph + 1) * 0.4);
            } else if (st === 1) {
              arms[0].rotation.set(-1.1 + Math.sin(t * sp * 2 + ph) * 0.5, 0, -0.5);
              arms[1].rotation.set(-1.1 - Math.sin(t * sp * 2 + ph) * 0.5, 0, 0.5);
            } else {
              arms[1].rotation.set(0, 0, 2.5 + Math.sin(t * sp * 2) * 0.3);
              arms[0].rotation.set(-0.3, 0, -0.4 - beat * 0.4);
            }
            // drift around the spot so the floor feels alive
            g.position.x = def.x + Math.sin(t * 0.0007 + ph) * 0.55;
            g.position.z = def.z + Math.cos(t * 0.0006 + ph * 1.3) * 0.45;
            wantYaw = def.yaw + Math.sin(t * 0.0009 + ph) * 0.9;
          } else {
            // between songs: sway and chat
            rz = Math.sin(t * 0.0015 + ph) * 0.03;
            arms[1].rotation.set(-0.5 + Math.sin(t * 0.003 + ph) * 0.2, 0, -0.1);
            wantYaw = nearMe ? Math.atan2(dxm, dzm) : def.yaw;
          }
        } else if (def.kind === "scientist" && def.path) {
          const [tx, tz] = def.path[s.wp % def.path.length];
          const dx = tx - g.position.x;
          const dz = tz - g.position.z;
          const d = Math.hypot(dx, dz);
          if (s.wait > 0) {
            s.wait -= dt;
            // explaining: points up at the hologram
            wantYaw = nearMe ? Math.atan2(dxm, dzm) : Math.atan2(0 - g.position.x, -1.5 - g.position.z);
            arms[1].rotation.set(-1.4 + Math.sin(t * 0.004) * 0.15, 0, -0.55);
            arms[0].rotation.set(-0.5, 0, 0.2);
          } else if (d < 0.1) {
            s.wp++;
            s.wait = 5 + (s.wp % 3);
          } else {
            moving = true;
            const sp = 0.8;
            g.position.x += (dx / d) * sp * dt;
            g.position.z += (dz / d) * sp * dt;
            wantYaw = Math.atan2(dx, dz);
            const sw = Math.sin(t * 0.007) * 0.55;
            legs[0].rotation.x = sw;
            legs[1].rotation.x = -sw;
            arms[0].rotation.x = -sw * 0.6;
            arms[1].rotation.x = sw * 0.6;
            bob = Math.abs(Math.sin(t * 0.007)) * 0.025;
          }
        } else if (def.kind === "tech") {
          // typing on a tablet
          arms[0].rotation.set(-1.05, 0, 0.35);
          arms[1].rotation.set(-1.05, 0, -0.35);
          arms[0].rotation.x += Math.sin(t * 0.03) * 0.03;
          arms[1].rotation.x += Math.sin(t * 0.027 + 1) * 0.03;
          if (!nearMe) wantYaw = def.yaw;
        }

        g.rotation.y = lerpAng(g.rotation.y, wantYaw, Math.min(1, 4 * dt));
        g.rotation.z = rz;
        g.position.y = Math.max(0, bob);
        const b = (t + ph * 700) % 4200 < 120 ? 0.12 : 1;
        eyes.forEach((o) => (o.scale.y = b));
        void moving;
      });
    },
    dispose() {
      scene.remove(root);
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
        }
        const sp = o as THREE.Sprite;
        if (sp.isSprite) {
          sp.material.map?.dispose();
          sp.material.dispose();
        }
      });
      list.forEach((s) => s.cup && disposeCup(s.cup));
    },
  };
}
