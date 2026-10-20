import * as THREE from "three";
import { buildLounge, type Collider } from "@/lib/world/lounge";
import { getRoom, type RoomId, type Seat, type Spawn } from "@/lib/world/rooms";
import { addHuddles, addPortals, buildRoom } from "@/lib/world/roomBuilders";
import { makeAvatar, type AvatarConfig } from "@/lib/world/avatar";
import { addFx, addRing } from "@/lib/world/fx";
import { THEMES, addOrb, makeThemeCtl, type BurstKind } from "@/lib/world/orb";
import { musicBands, musicLevel, playing } from "@/lib/world/music";
import { addConnect, type LinkNode } from "@/lib/world/connect";
import { addTerrace, onTerrace } from "@/lib/world/terrace";
import { addSky } from "@/lib/world/sky";
import { addJoystick } from "@/lib/world/joystick";
import { addAura } from "@/lib/world/aura";
import { disposeCompanion, followPet, makeCompanion } from "@/lib/world/companion";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { load } from "@/lib/social/store";
import type { Loadout } from "@/lib/economy/catalog";

export interface RemotePeerState {
  x: number;
  z: number;
  yaw: number;
  cfg?: AvatarConfig;
  /** True while sitting on a chair. */
  sit?: boolean;
}

/** What the big context button should offer right now (sit, stand, use the orb…). */
/** Emoji people can float above their head. */
export const REACTIONS = ["❤️", "👏", "🔥", "😂", "🚀", "💡", "🤯", "👍"];

export interface WorldContext { kind: "sit" | "stand" | "orb"; label: string }

export interface WorldOptions {
  full: boolean;
  /** Which world to build (default: the lounge). */
  room?: RoomId;
  /** Where to appear (default: the world's own spawn point). */
  spawn?: Spawn;
  myName: string;
  /** One line under my name tag (profile headline). */
  mySub?: string;
  myCfg: AvatarConfig;
  /** Presence adapter — provided when the user is authenticated. */
  into?: {
    /** Throttled by the adapter; called whenever I move. */
    send: (s: RemotePeerState) => void;
  };
  onPeersChanged?: (count: number) => void;
  /** Fired when the user taps/clicks another player's avatar (full mode only). */
  onPeerClick?: (id: string) => void;
  /** Fired when the user taps/clicks the Lumen Orb. */
  onOrbClick?: () => void;
  /** Fired when I walk up to / away from the orb. */
  onOrbNear?: (near: boolean) => void;
  /** Fired once when I walk into a portal ring. */
  onPortal?: (to: RoomId) => void;
  /** Fired when I step into / out of a private talk circle. */
  onHuddle?: (h: { id: string; name: string } | null) => void;
  /** Fired when the context button should change (null = hide it). */
  onContext?: (c: WorldContext | null) => void;
}

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

export interface World {
  destroy: () => void;
  applyPeerState: (id: string, name: string, cfg: AvatarConfig, s: RemotePeerState, gear?: Loadout, sub?: string) => void;
  removePeer: (id: string) => void;
  /** id null = me. Shows a chat bubble above the avatar. */
  say: (id: string | null, text: string) => void;
  /** id null = me. e is "wave", "dance", "clap" or "jump". */
  emote: (id: string | null, e: string) => void;
  /** Move me to a spot in the lounge. */
  teleport: (x: number, z: number) => void;
  /** Lumen Orb: re-tint the lounge ("midnight" | "aurora" | "sunset" | "neon"). */
  setTheme: (id: string) => void;
  burst: (kind: BurstKind) => void;
  /** Floating message above the orb. */
  shout: (name: string, text: string) => void;
  /** Everyone (me + peers) plays an emote. */
  emoteAll: (e: string) => void;
  /** Do whatever the context button says (sit, stand, use the orb). */
  interact: () => void;
  /** Jump to the nearest free chair and sit. Returns false if none is free. */
  sitNearest: () => boolean;
  stand: () => void;
  /** Float an emoji above a head. id null = me. */
  react: (id: string | null, emoji: string) => void;
  /** Glow a name tag while someone talks. id null = me. */
  setSpeaking: (id: string | null, on: boolean) => void;
  /** "high" turns on the glow (bloom) pass; "low" is lighter for slow phones. */
  setQuality: (q: "high" | "low") => void;
  /** Change the text on the shared screen (meeting agenda / prompt wall). */
  setBoard: (text: string) => void;
}

/** Height of a chair seat; a sitting avatar's hips are placed here. */
const SEAT_H = 0.46;

export function pose(g: THREE.Group, moving: boolean, t: number) {
  const legs = g.userData.legs as THREE.Group[],
    arms = g.userData.arms as THREE.Group[];
  const e = performance.now() < ((g.userData.until as number) || 0) ? (g.userData.emote as string) : "";
  const sw = moving ? Math.sin(t * 0.009) * 0.7 : 0;
  legs[0].rotation.x = sw;
  legs[1].rotation.x = -sw;
  arms[0].rotation.set(-sw * 0.8, 0, 0);
  arms[1].rotation.set(sw * 0.8, 0, 0);
  let bob = moving ? Math.abs(Math.sin(t * 0.009)) * 0.04 : Math.sin(t * 0.002) * 0.012;
  g.rotation.z = 0;
  if (e === "wave") arms[1].rotation.set(0, 0, 2.6 + Math.sin(t * 0.016) * 0.4);
  if (e === "hand") arms[1].rotation.set(0, 0, 2.95 + Math.sin(t * 0.005) * 0.08);
  if (e === "dance") {
    bob = Math.abs(Math.sin(t * 0.012)) * 0.14;
    arms[0].rotation.set(0, 0, -(2.3 + Math.sin(t * 0.012) * 0.4));
    arms[1].rotation.set(0, 0, 2.3 + Math.sin(t * 0.012 + 1) * 0.4);
    g.rotation.z = Math.sin(t * 0.006) * 0.1;
  }
  if (e === "clap") {
    const k = 0.15 + 0.15 * Math.sin(t * 0.025);
    arms[0].rotation.set(-1.4, 0, k);
    arms[1].rotation.set(-1.4, 0, -k);
  }
  if (e === "jump") {
    bob = Math.abs(Math.sin(t * 0.008)) * 0.5;
    arms[0].rotation.set(0, 0, -2.2);
    arms[1].rotation.set(0, 0, 2.2);
  }
  const sit = !!g.userData.sit;
  if (sit) {
    legs[0].rotation.x = legs[1].rotation.x = -1.45;
    if (!e) {
      arms[0].rotation.set(-0.85, 0, 0.06);
      arms[1].rotation.set(-0.85, 0, -0.06);
    }
    g.rotation.z = 0;
    g.position.y = SEAT_H - ((g.userData.hipY as number) || 0.8) + Math.sin(t * 0.002) * 0.008;
  } else g.position.y = Math.max(0, bob);
  const eyes = g.userData.eyes as THREE.Object3D[] | undefined;
  if (eyes) {
    const b = (t + ((g.userData.phase as number) || 0)) % 3800 < 130 ? 0.12 : 1;
    eyes.forEach((o) => (o.scale.y = b));
  }
  const wings = g.userData.wings as THREE.Group[] | undefined;
  if (wings) {
    wings.forEach((w, i) => {
      const side = i === 0 ? -1 : 1;
      w.rotation.y = side * (0.5 + Math.sin(t * (moving ? 0.012 : 0.004)) * (moving ? 0.28 : 0.1));
    });
  }
  const cape = g.userData.cape as THREE.Group | undefined;
  if (cape) cape.rotation.x = 0.06 + (moving ? 0.38 : 0) + Math.sin(t * 0.004) * 0.04;
  const flames = g.userData.flames as THREE.Mesh[] | undefined;
  if (flames) flames.forEach((f, i) => f.scale.set(1, 0.7 + Math.abs(Math.sin(t * 0.03 + i)) * (moving ? 1.1 : 0.5), 1));
  const rp = g.userData.ringPivot as THREE.Group | undefined;
  if (rp) {
    rp.rotation.y = t * 0.0015;
    rp.position.y = 0.025 - g.position.y;
  }
}

const bubTimers = new Map<HTMLElement, number>();
function showBub(el: HTMLElement, text: string) {
  el.textContent = text.slice(0, 120);
  window.clearTimeout(bubTimers.get(el));
  bubTimers.set(el, window.setTimeout(() => (el.textContent = ""), 6000));
}

/** Name tag: bold name plus an optional small line (profile headline). */
function setTag(el: HTMLElement, name: string, sub?: string) {
  const key = name + "\u0001" + (sub || "");
  if (el.dataset.k === key) return;
  el.dataset.k = key;
  el.textContent = "";
  const b = document.createElement("b");
  b.textContent = name;
  el.appendChild(b);
  if (sub) {
    const m = document.createElement("small");
    m.textContent = sub;
    el.appendChild(m);
  }
}

class Peer {
  bubEl: HTMLDivElement;
  group: THREE.Group;
  tagEl: HTMLDivElement;
  targetX: number;
  targetZ: number;
  targetYaw: number;
  cfg: AvatarConfig;
  aura: ReturnType<typeof addAura> | null = null;
  auraId = "";
  pet: THREE.Group | null = null;
  petId = "";
  scene: THREE.Scene | null = null;

  constructor(cfg: AvatarConfig, s: RemotePeerState, host: HTMLElement) {
    this.cfg = cfg;
    this.group = makeAvatar(cfg);
    addRing(this.group, 0x7fb59a);
    this.group.position.set(s.x, 0, s.z);
    this.group.rotation.y = s.yaw;
    this.targetX = s.x;
    this.targetZ = s.z;
    this.targetYaw = s.yaw;
    this.tagEl = document.createElement("div");
    this.tagEl.className = "tag";
    this.tagEl.textContent = "";
    host.appendChild(this.tagEl);
    this.bubEl = document.createElement("div");
    this.bubEl.className = "bub";
    host.appendChild(this.bubEl);
  }

  setName(name: string, sub?: string) {
    setTag(this.tagEl, name, sub);
  }

  /** Show another player's shop gear (already shape-checked by presence). */
  setGear(g: Loadout | undefined, scene: THREE.Scene) {
    this.scene = scene;
    const a = g?.aura || "",
      p = g?.pet || "";
    if (a !== this.auraId) {
      this.aura?.dispose();
      this.aura = a ? addAura(this.group, a) : null;
      this.auraId = a;
    }
    if (p !== this.petId) {
      if (this.pet) {
        scene.remove(this.pet);
        disposeCompanion(this.pet);
      }
      this.pet = p ? makeCompanion(p) : null;
      if (this.pet) {
        this.pet.position.set(this.group.position.x, 0, this.group.position.z);
        scene.add(this.pet);
      }
      this.petId = p;
    }
  }

  dispose(host: HTMLElement) {
    this.aura?.dispose();
    if (this.pet) {
      this.scene?.remove(this.pet);
      disposeCompanion(this.pet);
    }
    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) (mesh.material as THREE.Material).dispose();
    });
    this.tagEl.remove();
    this.bubEl.remove();
    void host;
  }
}

/**
 * Runs the lounge. In `full` mode the user walks with WASD / arrows / on-screen
 * pad and every moved position is handed to the presence adapter (~10 Hz).
 * Remote peers arrive via `applyPeerState`; never persisted to Postgres.
 */
export function runWorld(
  host: HTMLElement,
  opts: WorldOptions
): World {
  if (!webglAvailable()) {
    host.innerHTML =
      '<div class="empty" style="margin:20px">3D is not available in this browser. Turn on hardware acceleration or try a current version of Chrome, Edge, Firefox or Safari.</div>';
    return { destroy: () => {}, applyPeerState: () => {}, removePeer: () => {}, say: () => {}, emote: () => {}, teleport: () => {}, setTheme: () => {}, burst: () => {}, shout: () => {}, emoteAll: () => {}, interact: () => {}, react: () => {}, setSpeaking: () => {}, setQuality: () => {}, sitNearest: () => false, stand: () => {}, setBoard: () => {} };
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  host.appendChild(renderer.domElement);

  const room = getRoom(opts.room);
  const isLounge = room.id === "lounge";
  const spawn = opts.spawn || room.spawn;
  // Glow (bloom) pass: makes neon, holograms and light strips shine. Built lazily; "low" skips it.
  let hq = true;
  try {
    hq = localStorage.getItem("barmo-gfx") !== "low";
  } catch {
    /* default high */
  }
  let composer: EffectComposer | null = null;
  const scene = new THREE.Scene();
  const col: Collider[] = [];
  let rb: ReturnType<typeof buildRoom> | null = null;
  if (isLounge) buildLounge(scene, col);
  else rb = buildRoom(scene, room, col);
  const theme = makeThemeCtl(scene);
  // Lounge-only extras (no-ops in the other worlds)
  const fx = isLounge ? addFx(scene) : { update: (_t: number) => {}, dispose: () => {} };
  const orb = addOrb(scene, room.orb);
  const web = addConnect(scene);
  const terrace = isLounge
    ? addTerrace(scene)
    : { update: (_t: number, _dt: number, _me: THREE.Object3D) => {}, dispose: () => {}, riding: () => false };
  const portals = addPortals(scene, room);
  const huddles = addHuddles(scene, room);
  let startDay = new Date().getHours() >= 6 && new Date().getHours() < 18;
  try {
    const sv = localStorage.getItem("barmo-sky");
    if (sv) startDay = sv === "day";
  } catch {
    /* storage unavailable - use the clock */
  }
  const sky = isLounge
    ? addSky(scene, startDay)
    : { apply: (_dt: number) => {}, restore: () => {}, dispose: () => {}, isDay: () => false, toggle: () => false };
  let skyBtn: HTMLButtonElement | null = null;
  if (opts.full && isLounge) {
    skyBtn = document.createElement("button");
    skyBtn.className = "skybtn";
    skyBtn.setAttribute("aria-label", "Switch between day and night");
    skyBtn.textContent = sky.isDay() ? "🌙" : "☀️";
    skyBtn.onclick = () => {
      const d = sky.toggle();
      skyBtn!.textContent = d ? "🌙" : "☀️";
      try {
        localStorage.setItem("barmo-sky", d ? "day" : "night");
      } catch {
        /* ignore */
      }
    };
    host.appendChild(skyBtn);
  }
  let joy: ReturnType<typeof addJoystick> | null = null;
  const things: LinkNode[] = [
    { id: "t:orb", x: room.orb.x, z: room.orb.z, kind: "thing" },
    ...room.zones.filter((z) => z.id !== "orb").map((z): LinkNode => ({ id: "t:" + z.id, x: z.x, z: z.z, kind: "thing" })),
  ];
  col.push({ x: room.orb.x, z: room.orb.z, w: 1.0, d: 1.0 });
  let orbNear = false;
  const shoutEl = document.createElement("div");
  shoutEl.className = "zl shout";
  shoutEl.style.display = "none";
  host.appendChild(shoutEl);
  let shoutTimer = 0;
  let shoutOn = false;

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 80);
  const me = makeAvatar(opts.myCfg);
  addRing(me, 0xc8a26b);
  me.position.set(spawn.x, 0, spawn.z);
  scene.add(me);
  const myLo: Loadout = opts.full ? load<Loadout>("loadout", {}) : {};
  const aura = myLo.aura ? addAura(me, myLo.aura) : null;
  const myPet = myLo.pet ? makeCompanion(myLo.pet) : null; // follows me in the lounge (the rooftop has its own roaming pet)
  if (myPet) {
    myPet.position.set(me.position.x, 0, me.position.z);
    scene.add(myPet);
  }

  const tag = document.createElement("div");
  tag.className = "tag";
  setTag(tag, opts.myName, opts.mySub);
  host.appendChild(tag);
  const bub = document.createElement("div");
  bub.className = "bub";
  host.appendChild(bub);
  let meMoving = false;
  const zl = room.zones.map((z) => {
    const d = document.createElement("div");
    d.className = "zl";
    d.textContent = z.icon + " " + (z.id === "orb" ? room.orbName : z.name);
    host.appendChild(d);
    return d;
  });
  const hl = room.huddles.map((h) => {
    const d = document.createElement("div");
    d.className = "zl huddle";
    d.textContent = "🔒 " + h.name;
    host.appendChild(d);
    return d;
  });
  let huddleIdx = -1;
  const pl = room.portals.map((p) => {
    const to = getRoom(p.to);
    const d = document.createElement("div");
    d.className = "zl portal";
    d.textContent = to.icon + " " + to.name;
    host.appendChild(d);
    return d;
  });

  const peers = new Map<string, Peer>();

  const keys: Record<string, boolean> = {};
  let yaw = spawn.yaw,
    raf = 0,
    last = performance.now(),
    ang = 0;

  // --- sitting, tap-to-move, portals, context button ---
  let seat: Seat | null = null;
  let goal: { x: number; z: number } | null = null;
  let pendingSit: Seat | null = null;
  let stuck = 0;
  let armed = false; // portals only fire after you have stepped away from them once
  let left = false;
  let ctxKey = "";
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.4, 28), new THREE.MeshBasicMaterial({ color: room.color, transparent: true, opacity: 0.9, depthWrite: false }));
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.04;
  marker.visible = false;
  scene.add(marker);
  // A glowing ring that sweeps up a body when someone appears (holographic "scan-in").
  const scans: { m: THREE.Mesh; t0: number; g: THREE.Object3D }[] = [];
  const scanIn = (g: THREE.Object3D, color: number) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.025, 8, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.x = Math.PI / 2;
    scene.add(m);
    scans.push({ m, t0: performance.now(), g });
  };
  const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  scanIn(me, room.color);
  me.rotation.y = yaw;
  camera.position.set(spawn.x - Math.sin(yaw) * 5, 3.4, spawn.z - Math.cos(yaw) * 5);
  const seatTaken = (st: Seat) =>
    [...peers.values()].some((p) => p.group.userData.sit && Math.hypot(p.group.position.x - st.x, p.group.position.z - st.z) < 0.7);
  const nearestSeat = (maxD: number) => {
    let best: Seat | null = null;
    let bd = maxD;
    room.seats.forEach((st) => {
      const d = Math.hypot(st.x - me.position.x, st.z - me.position.z);
      if (d < bd && !seatTaken(st)) {
        bd = d;
        best = st;
      }
    });
    return best as Seat | null;
  };
  const sitDown = (st: Seat) => {
    seat = st;
    goal = null;
    pendingSit = null;
    marker.visible = false;
    me.position.set(st.x, 0, st.z);
    yaw = st.yaw;
    me.rotation.y = st.yaw;
    me.userData.sit = true;
  };
  const standUp = () => {
    if (!seat) return;
    const nx = me.position.x - Math.sin(seat.yaw) * 0.95;
    const nz = me.position.z - Math.cos(seat.yaw) * 0.95;
    if (!blocked(nx, nz)) me.position.set(nx, 0, nz);
    seat = null;
    me.userData.sit = false;
  };

  const MOVEMENT_KEYS = [
    "w",
    "a",
    "s",
    "d",
    "arrowup",
    "arrowdown",
    "arrowleft",
    "arrowright",
  ] as const;

  const kd = (e: KeyboardEvent) => {
    if (/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)) return;
    const k = e.key.toLowerCase();
    if (k === "e" && e.type === "keydown" && !e.repeat) {
      interact();
      return;
    }
    if ((MOVEMENT_KEYS as readonly string[]).includes(k)) {
      keys[k] = e.type === "keydown";
      e.preventDefault();
    }
  };
  addEventListener("keydown", kd);
  addEventListener("keyup", kd);

  if (opts.full) {
    const pad = document.createElement("div");
    pad.className = "pad";
    pad.innerHTML =
      '<button class="u" data-k="w" aria-label="Forward">&#9650;</button><button data-k="a" aria-label="Left">&#9664;</button><button data-k="s" aria-label="Back">&#9660;</button><button data-k="d" aria-label="Right">&#9654;</button>';
    pad.querySelectorAll("button").forEach((b) => {
      const k = (b as HTMLElement).dataset.k as string;
      ["pointerdown"].forEach((ev) => b.addEventListener(ev, () => (keys[k] = true)));
      ["pointerup", "pointerleave", "pointercancel"].forEach((ev) =>
        b.addEventListener(ev, () => (keys[k] = false))
      );
    });
    host.appendChild(pad);
    // Touch devices get an analog joystick instead of the arrow pad.
    if (typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches) {
      joy = addJoystick(host);
      pad.style.display = "none";
    }

    // Drag to look around (touch + mouse) and tap an avatar to open its profile card.
    const cv = renderer.domElement;
    cv.style.touchAction = "none";
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    let pd: { sx: number; sy: number; lx: number; t: number; moved: boolean } | null = null;
    cv.addEventListener("pointerdown", (e) => {
      pd = { sx: e.clientX, sy: e.clientY, lx: e.clientX, t: performance.now(), moved: false };
    });
    cv.addEventListener("pointermove", (e) => {
      if (!pd) return;
      if (!pd.moved && Math.hypot(e.clientX - pd.sx, e.clientY - pd.sy) > 8) pd.moved = true;
      if (pd.moved) {
        yaw -= (e.clientX - pd.lx) * 0.006;
        pd.lx = e.clientX;
      }
    });
    const endPtr = (e: PointerEvent) => {
      const d = pd;
      pd = null;
      if (!d || d.moved || performance.now() - d.t > 500 || (!opts.onPeerClick && !opts.onOrbClick)) return;
      const r = cv.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      let best: string | null = null;
      let bd = Infinity;
      peers.forEach((p, id) => {
        const hit = ray.intersectObject(p.group, true)[0];
        if (hit && hit.distance < bd) {
          bd = hit.distance;
          best = id;
        }
      });
      const oh = opts.onOrbClick ? ray.intersectObject(orb.group, true)[0] : undefined;
      if (oh && oh.distance < bd) opts.onOrbClick?.();
      else if (best) opts.onPeerClick?.(best);
      else {
        // Tap the floor (or a chair, or a portal) and walk there.
        const gp = new THREE.Vector3();
        if (!ray.ray.intersectPlane(groundPlane, gp)) return;
        const chair = room.seats.find((st) => Math.hypot(st.x - gp.x, st.z - gp.z) < 0.8 && !seatTaken(st));
        const ring = room.portals.find((p) => Math.hypot(p.x - gp.x, p.z - gp.z) < 1.1);
        let tx = gp.x;
        let tz = gp.z;
        if (chair) {
          tx = chair.x;
          tz = chair.z;
        } else if (ring) {
          tx = ring.x;
          tz = ring.z;
        } else if (blocked(tx, tz)) return;
        if (seat) standUp();
        goal = { x: tx, z: tz };
        pendingSit = chair || null;
        stuck = 0;
        marker.position.set(tx, 0.04, tz);
        marker.visible = true;
      }
    };
    cv.addEventListener("pointerup", endPtr);
    cv.addEventListener("pointercancel", () => (pd = null));
  }

  function interact() {
    if (seat) {
      standUp();
      return;
    }
    const st = nearestSeat(1.7);
    if (st) sitDown(st);
    else if (orbNear) opts.onOrbClick?.();
  }

  function size() {
    const w = host.clientWidth,
      h = host.clientHeight || 320;
    renderer.setSize(w, h);
    composer?.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  size();
  const ro = new ResizeObserver(size);
  ro.observe(host);

  function blocked(x: number, z: number) {
    if (isLounge) {
      if (!onTerrace(x, z) && (Math.abs(x) > 11.3 || Math.abs(z) > 8.3 || z < -8.3)) return true;
    } else if (Math.abs(x) > room.hw || z < room.z0 || z > room.z1) return true;
    return col.some((c) => Math.abs(x - c.x) < c.w && Math.abs(z - c.z) < c.d);
  }

  const v = new THREE.Vector3();
  let lastSend = 0;

  function loop(t: number) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;

    if (opts.full) {
      let f = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1: 0),
        s = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
      if (joy) {
        if (!f) f = joy.y();
        if (!s) s = joy.x();
      }
      const manual = f !== 0 || s !== 0;
      if (manual) {
        goal = null;
        pendingSit = null;
        marker.visible = false;
        if (seat) standUp();
      }
      if (seat) {
        me.position.set(seat.x, 0, seat.z);
        yaw += wrap(seat.yaw - yaw);
        meMoving = false;
      } else {
        if (!manual && goal) {
          const dx = goal.x - me.position.x,
            dz = goal.z - me.position.z;
          if (Math.hypot(dx, dz) < 0.3) {
            const ps = pendingSit;
            goal = null;
            pendingSit = null;
            marker.visible = false;
            if (ps && !seatTaken(ps)) sitDown(ps);
          } else {
            const diff = wrap(Math.atan2(dx, dz) - yaw);
            yaw += diff * Math.min(1, 9 * dt);
            f = Math.abs(diff) < 1.3 ? 1 : 0;
          }
        }
        meMoving = f !== 0 || s !== 0;
        yaw -= s * 2.2 * dt;
        if (f) {
          const step = 4 * (terrace.riding() ? 1.5 : 1) * dt;
          const ox = me.position.x,
            oz = me.position.z;
          const nx = ox + Math.sin(yaw) * f * step,
            nz = oz + Math.cos(yaw) * f * step;
          if (!blocked(nx, oz)) me.position.x = nx;
          if (!blocked(me.position.x, nz)) me.position.z = nz;
          if (goal) {
            // Walking into a wall or table: give up on the tap target instead of pushing forever.
            stuck = Math.hypot(me.position.x - ox, me.position.z - oz) < step * 0.25 ? stuck + dt : 0;
            if (stuck > 0.45) {
              goal = null;
              pendingSit = null;
              marker.visible = false;
              stuck = 0;
            }
          }
        }
      }
      me.rotation.y += wrap(yaw - me.rotation.y) * Math.min(1, 10 * dt);

      // Share my movement at ~10 Hz — transient, broadcast only, never stored.
      if (t - lastSend > 100 && opts.into) {
        lastSend = t;
        opts.into.send({ x: me.position.x, z: me.position.z, yaw: me.rotation.y, sit: !!seat });
      }

      const tx = me.position.x - Math.sin(yaw) * 5,
        tz = me.position.z - Math.cos(yaw) * 5;
      camera.position.lerp(v.set(tx, 3.4, tz), Math.min(1, 4 * dt));
      camera.lookAt(me.position.x, 1.2, me.position.z);
    } else {
      ang += dt * 0.12;
      camera.position.set(Math.sin(ang) * 13, 5.5, Math.cos(ang) * 9 + 1);
      camera.lookAt(1, 1, 0);
      me.position.set(1.5, 0, 3);
    }

    fx.update(t);
    rb?.update(t, dt, musicLevel(), musicBands(24));
    for (let i = scans.length - 1; i >= 0; i--) {
      const sc = scans[i];
      const p = (performance.now() - sc.t0) / 1100;
      if (p >= 1) {
        scene.remove(sc.m);
        sc.m.geometry.dispose();
        (sc.m.material as THREE.Material).dispose();
        scans.splice(i, 1);
        continue;
      }
      sc.m.position.set(sc.g.position.x, p * (((sc.g.userData.top as number) || 1.7) + 0.2), sc.g.position.z);
      (sc.m.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - p);
    }
    portals.update(t);
    huddles.update(t, huddleIdx);
    if (marker.visible) marker.scale.setScalar(1 + Math.sin(t * 0.008) * 0.14);
    theme.update();
    sky.apply(dt);
    orb.update(t, dt, musicLevel(), musicBands(20), playing() !== null);
    {
      const near = Math.hypot(me.position.x - room.orb.x, me.position.z - room.orb.z) < 2.8;
      if (near !== orbNear) {
        orbNear = near;
        opts.onOrbNear?.(near);
      }
      v.set(room.orb.x, 3.0, room.orb.z).project(camera);
      shoutEl.style.left = (v.x * 0.5 + 0.5) * host.clientWidth + "px";
      shoutEl.style.top = (-v.y * 0.5 + 0.5) * host.clientHeight + "px";
      shoutEl.style.display = shoutOn && v.z < 1 ? "block" : "none";
    }
    if (opts.full) {
      // What the big button should offer, and walking into portal rings.
      let c: WorldContext | null = null;
      if (seat) c = { kind: "stand", label: "Stand up" };
      else if (nearestSeat(1.7)) c = { kind: "sit", label: "Sit down" };
      else if (orbNear) c = { kind: "orb", label: "Use " + room.orbName };
      const key = c ? c.kind + c.label : "";
      if (key !== ctxKey) {
        ctxKey = key;
        opts.onContext?.(c);
      }
      const hi = room.huddles.findIndex((h) => Math.hypot(h.x - me.position.x, h.z - me.position.z) < h.r - 0.1);
      if (hi !== huddleIdx) {
        huddleIdx = hi;
        opts.onHuddle?.(hi >= 0 ? { id: room.huddles[hi].id, name: room.huddles[hi].name } : null);
      }
      if (!left) {
        let dmin = Infinity;
        let hit: RoomId | null = null;
        for (const pr of room.portals) {
          const d = Math.hypot(pr.x - me.position.x, pr.z - me.position.z);
          if (d < dmin) dmin = d;
          if (d < 1.0) hit = pr.to;
        }
        if (!armed && dmin > 2.2) armed = true;
        if (armed && hit) {
          left = true;
          opts.onPortal?.(hit);
        }
      }
    }
    // Connection web: arcs + light pulses between nearby people and the things they use.
    try {
      const nodes: LinkNode[] = [{ id: "me", x: me.position.x, z: me.position.z, kind: "me" }, ...things];
      peers.forEach((p, id) => nodes.push({ id, x: p.group.position.x, z: p.group.position.z, kind: "peer" }));
      web.update(t, dt, nodes);
    } catch {
      /* visual only - never block the lounge */
    }
    // Interpolate peers toward their last known positions.
    pose(me, meMoving, t);
    try {
      terrace.update(t, dt, me); // rooftop pet + hoverboard (local only)
      aura?.update(t);
      if (myPet) {
        myPet.visible = !(isLounge && onTerrace(me.position.x, me.position.z));
        followPet(myPet, me, t, dt);
      }
    } catch {
      /* visual only */
    }
    peers.forEach((p) => {
      pose(p.group, Math.hypot(p.targetX - p.group.position.x, p.targetZ - p.group.position.z) > 0.05, t);
      p.group.position.x += (p.targetX - p.group.position.x) * Math.min(1, 8 * dt);
      p.group.position.z += (p.targetZ - p.group.position.z) * Math.min(1, 8 * dt);
      p.group.rotation.y += (p.targetYaw - p.group.rotation.y) * Math.min(1, 8 * dt);
      if (p.aura) {
        const near = Math.hypot(p.group.position.x - me.position.x, p.group.position.z - me.position.z) < 16; // skip far auras: keeps phones smooth
        p.aura.root.visible = near;
        if (near) p.aura.update(t);
      }
      if (p.pet) followPet(p.pet, p.group, t, dt);
      v.set(p.group.position.x, (p.group.userData.top as number) + 0.22, p.group.position.z).project(camera);
      p.tagEl.style.left = (v.x * 0.5 + 0.5) * host.clientWidth + "px";
      p.tagEl.style.top = (-v.y * 0.5 + 0.5) * host.clientHeight + "px";
      p.tagEl.style.display = v.z < 1 ? "block" : "none";
      p.bubEl.style.left = p.tagEl.style.left;
      p.bubEl.style.top = parseFloat(p.tagEl.style.top) - 30 + "px";
      p.bubEl.style.display = v.z < 1 && p.bubEl.textContent ? "block" : "none";
    });

    if (hq) {
      if (!composer) {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        composer.addPass(new UnrealBloomPass(new THREE.Vector2(host.clientWidth, host.clientHeight), 0.55, 0.6, 0.85));
        composer.addPass(new OutputPass());
        composer.setSize(host.clientWidth, host.clientHeight || 320);
      }
      composer.render(dt);
    } else renderer.render(scene, camera);
    sky.restore();
    v.set(me.position.x, (me.userData.top as number) + 0.22, me.position.z).project(camera);
    tag.style.left = (v.x * 0.5 + 0.5) * host.clientWidth + "px";
    tag.style.top = (-v.y * 0.5 + 0.5) * host.clientHeight + "px";
    tag.style.display = v.z < 1 ? "block" : "none";
    bub.style.left = tag.style.left;
    bub.style.top = parseFloat(tag.style.top) - 30 + "px";
    bub.style.display = v.z < 1 && bub.textContent ? "block" : "none";
    room.zones.forEach((z, i) => {
      v.set(z.x, 2.4, z.z).project(camera);
      zl[i].style.left = (v.x * 0.5 + 0.5) * host.clientWidth + "px";
      zl[i].style.top = (-v.y * 0.5 + 0.5) * host.clientHeight + "px";
      zl[i].style.display = v.z < 1 ? "block" : "none";
    });
    room.huddles.forEach((h, i) => {
      v.set(h.x, 1.9, h.z).project(camera);
      hl[i].style.left = (v.x * 0.5 + 0.5) * host.clientWidth + "px";
      hl[i].style.top = (-v.y * 0.5 + 0.5) * host.clientHeight + "px";
      hl[i].style.display = v.z < 1 && Math.hypot(h.x - me.position.x, h.z - me.position.z) < 14 ? "block" : "none";
    });
    room.portals.forEach((p, i) => {
      v.set(p.x, 2.7, p.z).project(camera);
      pl[i].style.left = (v.x * 0.5 + 0.5) * host.clientWidth + "px";
      pl[i].style.top = (-v.y * 0.5 + 0.5) * host.clientHeight + "px";
      pl[i].style.display = v.z < 1 ? "block" : "none";
    });
  }
  raf = requestAnimationFrame(loop);

  opts.onPeersChanged?.(0);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      removeEventListener("keydown", kd);
      removeEventListener("keyup", kd);
      ro.disconnect();
      fx.dispose();
      orb.dispose();
      web.dispose();
      terrace.dispose();
      portals.dispose();
      huddles.dispose();
      rb?.dispose();
      scene.remove(marker);
      marker.geometry.dispose();
      (marker.material as THREE.Material).dispose();
      sky.dispose();
      aura?.dispose();
      if (myPet) {
        scene.remove(myPet);
        disposeCompanion(myPet);
      }
      skyBtn?.remove();
      joy?.dispose();
      window.clearTimeout(shoutTimer);
      shoutEl.remove();
      composer?.dispose();
      renderer.dispose();
      peers.forEach((p) => p.dispose(host));
      peers.clear();
      tag.remove();
      bub.remove();
      zl.forEach((e) => e.remove());
      pl.forEach((e) => e.remove());
      hl.forEach((e) => e.remove());
      renderer.domElement.remove();
      host.querySelectorAll(".pad").forEach((el) => el.remove());
    },
    applyPeerState(id, name, cfg, s, gear, sub) {
      let p = peers.get(id);
      if (!p) {
        p = new Peer(cfg, s, host);
        peers.set(id, p);
        scene.add(p.group);
        scanIn(p.group, 0x7fe8c8);
        opts.onPeersChanged?.(peers.size);
      } else if (JSON.stringify(p.cfg) !== JSON.stringify(cfg)) {
        scene.remove(p.group);
        p.dispose(host);
        p = new Peer(cfg, s, host);
        peers.set(id, p);
        scene.add(p.group);
      }
      p.group.userData.sit = !!s.sit;
      p.setGear(gear, scene);
      p.setName(name, sub);
      p.targetX = s.x;
      p.targetZ = s.z;
      p.targetYaw = s.yaw;
    },
    teleport(x, z) {
      seat = null;
      me.userData.sit = false;
      goal = null;
      pendingSit = null;
      marker.visible = false;
      me.position.set(x, 0, z);
      yaw = z < -2 ? Math.PI : 0;
      me.rotation.y = yaw;
      camera.position.set(x - Math.sin(yaw) * 5, 3.4, z - Math.cos(yaw) * 5);
    },
    say(id, text) {
      const el = id ? peers.get(id)?.bubEl : bub;
      if (el) showBub(el, text);
    },
    emote(id, e) {
      const g = id ? peers.get(id)?.group : me;
      if (!g || !["wave", "dance", "clap", "jump", "hand"].includes(e)) return;
      g.userData.emote = e;
      g.userData.until = performance.now() + (e === "dance" ? 6000 : e === "jump" ? 2500 : e === "hand" ? 9000 : 3000);
    },
    setTheme(id) {
      theme.set(id);
      const t = THEMES.find((x) => x.id === id) || THEMES[0];
      orb.setColor(t.orb);
    },
    burst(kind) {
      orb.burst(kind);
    },
    shout(name, text) {
      shoutEl.textContent = `${name}: ${text}`.slice(0, 90);
      shoutOn = true;
      window.clearTimeout(shoutTimer);
      shoutTimer = window.setTimeout(() => (shoutOn = false), 9000);
    },
    emoteAll(e) {
      const until = performance.now() + 6000;
      [me, ...[...peers.values()].map((p) => p.group)].forEach((g) => {
        g.userData.emote = e;
        g.userData.until = until;
      });
    },
    interact: () => interact(),
    sitNearest() {
      const st = nearestSeat(Infinity);
      if (!st) return false;
      sitDown(st);
      return true;
    },
    stand: () => standUp(),
    react(id, emoji) {
      if (!REACTIONS.includes(emoji)) return;
      const g = id ? peers.get(id)?.group : me;
      if (!g) return;
      v.set(g.position.x, ((g.userData.top as number) || 1.7) + 0.5, g.position.z).project(camera);
      if (v.z >= 1) return;
      const el = document.createElement("div");
      el.className = "react";
      el.textContent = emoji;
      el.style.left = (v.x * 0.5 + 0.5) * host.clientWidth + (Math.random() * 30 - 15) + "px";
      el.style.top = (-v.y * 0.5 + 0.5) * host.clientHeight + "px";
      host.appendChild(el);
      window.setTimeout(() => el.remove(), 2300);
    },
    setSpeaking(id, on) {
      (id ? peers.get(id)?.tagEl : tag)?.classList.toggle("speaking", on);
    },
    setQuality(q) {
      hq = q === "high";
    },
    setBoard(text) {
      rb?.setBoard?.(text);
    },
    removePeer(id) {
      const p = peers.get(id);
      if (!p) return;
      scene.remove(p.group);
      p.dispose(host);
      peers.delete(id);
      opts.onPeersChanged?.(peers.size);
    },
  };
}
