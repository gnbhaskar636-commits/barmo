import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { RoomDef } from "@/lib/world/rooms";
import type { Collider } from "@/lib/world/lounge";

/**
 * V1 realism pass. Everything here is additive and guarded:
 *  - filmic tone mapping + soft real-time shadows + reflections from a studio environment map
 *  - subtle surface grain on big floors
 *  - extra 3D set dressing: city windows, ceiling beams, floor lamps and framed art
 * "Low" graphics (Settings) switches the heavy parts off.
 */

const isStd = (m: THREE.Material | THREE.Material[]) => (Array.isArray(m) ? m : [m]).some((x) => (x as THREE.MeshStandardMaterial).isMeshStandardMaterial);
const isGlass = (m: THREE.Material | THREE.Material[]) => (Array.isArray(m) ? m : [m]).some((x) => x.transparent);

/** Lets an object (an avatar, a pet) cast and receive shadows. Cheap; safe to call on anything. */
export function shade(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh) return;
    if (!isStd(m.material) || isGlass(m.material)) return;
    m.castShadow = true;
    m.receiveShadow = true;
  });
}

function grainTexture() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const cx = cv.getContext("2d");
  if (!cx) return null;
  cx.fillStyle = "#e8e8e8";
  cx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const v = 200 + Math.floor(Math.random() * 55);
    cx.fillStyle = `rgba(${v},${v},${v},0.55)`;
    cx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  for (let i = 0; i < 14; i++) {
    const g = cx.createRadialGradient(Math.random() * 256, Math.random() * 256, 0, Math.random() * 256, Math.random() * 256, 70);
    g.addColorStop(0, "rgba(255,255,255,0.10)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    cx.fillStyle = g;
    cx.fillRect(0, 0, 256, 256);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function skylineTexture(tint: number) {
  const cv = document.createElement("canvas");
  cv.width = 1024;
  cv.height = 192;
  const cx = cv.getContext("2d");
  if (!cx) return null;
  const sky = cx.createLinearGradient(0, 0, 0, 192);
  sky.addColorStop(0, "#050816");
  sky.addColorStop(0.7, "#1a1b3a");
  sky.addColorStop(1, "#3a2447");
  cx.fillStyle = sky;
  cx.fillRect(0, 0, 1024, 192);
  for (let i = 0; i < 70; i++) {
    cx.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.6})`;
    cx.fillRect(Math.random() * 1024, Math.random() * 90, 1.5, 1.5);
  }
  for (let layer = 0; layer < 2; layer++) {
    let x = -10;
    while (x < 1034) {
      const w = 28 + Math.random() * 60;
      const h = 40 + Math.random() * (layer ? 70 : 110);
      cx.fillStyle = layer ? "#12122a" : "#0a0a1c";
      cx.fillRect(x, 192 - h, w, h);
      for (let wy = 192 - h + 8; wy < 186; wy += 9)
        for (let wx = x + 5; wx < x + w - 6; wx += 8)
          if (Math.random() < 0.38) {
            cx.fillStyle = Math.random() < 0.8 ? "rgba(255,214,140,0.85)" : "rgba(160,210,255,0.8)";
            cx.fillRect(wx, wy, 3, 4);
          }
      x += w + 3 + Math.random() * 8;
    }
  }
  cx.fillStyle = "#" + tint.toString(16).padStart(6, "0");
  cx.globalAlpha = 0.12;
  cx.fillRect(0, 0, 1024, 192);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function artTexture(a: number, b: number) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 128;
  const cx = cv.getContext("2d");
  if (!cx) return null;
  const hex = (c: number) => "#" + c.toString(16).padStart(6, "0");
  const g = cx.createLinearGradient(0, 0, 128, 128);
  g.addColorStop(0, hex(a));
  g.addColorStop(1, hex(b));
  cx.fillStyle = g;
  cx.fillRect(0, 0, 128, 128);
  cx.globalAlpha = 0.35;
  for (let i = 0; i < 5; i++) {
    cx.fillStyle = i % 2 ? "#ffffff" : "#000000";
    cx.beginPath();
    cx.arc(Math.random() * 128, Math.random() * 128, 14 + Math.random() * 34, 0, Math.PI * 2);
    cx.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeRealism(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
  let envRT: THREE.WebGLRenderTarget | null = null;
  const owned: { dispose: () => void }[] = [];
  const lamps: THREE.Mesh[] = [];
  const coarse = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;

  const apply = (hq: boolean) => {
    renderer.toneMapping = hq ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = hq;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (hq) {
      if (!envRT) {
        try {
          const pm = new THREE.PMREMGenerator(renderer);
          const env = new RoomEnvironment();
          envRT = pm.fromScene(env, 0.04);
          const d = (env as unknown as { dispose?: () => void }).dispose;
          d?.call(env);
          pm.dispose();
        } catch {
          envRT = null;
        }
      }
      scene.environment = envRT ? envRT.texture : null;
      scene.environmentIntensity = 0.32;
    } else scene.environment = null;
  };

  /** Called once after a world is built: shadows, floor grain and the extra set dressing. */
  const prepare = (room: RoomDef, col: Collider[]) => {
    try {
      if (room.id === "meeting" || room.id === "party" || room.id === "lab") decorate(room, col);
    } catch {
      /* decoration is optional */
    }
    try {
      // one soft sun/key light casts the shadows
      let key: THREE.DirectionalLight | null = null;
      scene.traverse((o) => {
        const l = o as THREE.DirectionalLight;
        if (l.isDirectionalLight && !key) key = l;
      });
      const k = key as THREE.DirectionalLight | null;
      if (k) {
        k.castShadow = true;
        const s = coarse ? 1024 : 2048;
        k.shadow.mapSize.set(s, s);
        const c = k.shadow.camera;
        c.left = -15;
        c.right = 15;
        c.top = 15;
        c.bottom = -15;
        c.near = 1;
        c.far = 34;
        k.shadow.bias = -0.0005;
        k.shadow.normalBias = 0.035;
        k.shadow.radius = 3;
        c.updateProjectionMatrix();
      }
      const grain = grainTexture();
      if (grain) owned.push(grain);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !isStd(m.material) || isGlass(m.material)) return;
        const mat = m.material as THREE.MeshStandardMaterial;
        const isFloor = m.geometry.type === "PlaneGeometry" && Math.abs(m.rotation.x + Math.PI / 2) < 0.01 && m.position.y < 0.02;
        if (isFloor) {
          m.receiveShadow = true;
          const w = (m.geometry as THREE.PlaneGeometry).parameters.width;
          const h = (m.geometry as THREE.PlaneGeometry).parameters.height;
          if (grain && w > 10 && !Array.isArray(m.material) && !mat.map) {
            const t = grain.clone();
            t.needsUpdate = true;
            t.repeat.set(w / 3, h / 3);
            mat.map = t;
            mat.roughnessMap = t;
            mat.needsUpdate = true;
            owned.push(t);
          }
          return;
        }
        if (m.geometry.type === "PlaneGeometry") return; // walls and signs: receive nothing special
        if ((m as THREE.InstancedMesh).isInstancedMesh) return;
        m.castShadow = true;
        m.receiveShadow = true;
      });
    } catch {
      /* shadows are optional */
    }
  };

  const decorate = (room: RoomDef, col: Collider[]) => {
    const g = new THREE.Group();
    g.name = "v1-decor";
    scene.add(g);
    const metal = new THREE.MeshStandardMaterial({ color: 0x151a26, roughness: 0.45, metalness: 0.7 });
    const hw = room.hw + 0.6;
    const zc = (room.z0 + room.z1) / 2;
    const W = room.hw * 2 + 1.2;
    owned.push(metal);

    // ceiling beams
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(W, 0.18, 0.22), metal);
      b.position.set(0, 4.85, room.z0 + 0.8 + (i * (room.z1 - room.z0 - 1.6)) / 3);
      g.add(b);
      owned.push(b.geometry);
    }

    // city windows on both side walls (frame + night skyline)
    const sky = skylineTexture(room.color);
    if (sky) {
      owned.push(sky);
      const wm = new THREE.MeshBasicMaterial({ map: sky });
      owned.push(wm);
      [-1, 1].forEach((side) => {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.3), wm);
        win.position.set(side * (hw - 0.03), 3.35, zc);
        win.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        g.add(win);
        owned.push(win.geometry);
        const fr = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.5, 7.2), metal);
        fr.position.set(side * (hw - 0.06), 3.35, zc);
        g.add(fr);
        owned.push(fr.geometry);
        for (let k = -1; k <= 1; k++) {
          const mu = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.05), metal);
          mu.position.set(side * (hw - 0.07), 3.35, zc + k * 1.75);
          g.add(mu);
          owned.push(mu.geometry);
        }
      });
    }

    // framed art low on the side walls
    const pairs: [number, number][] = [[0x5ef2c8, 0x3a2a7a], [0xff6a8a, 0x2a1f4a], [0xffc86a, 0x7a3a2a], [0x6bb5ff, 0x1d2a5a]];
    [-1, 1].forEach((side, si) => {
      [-2.6, 2.6].forEach((dz, di) => {
        const [a, b] = pairs[(si * 2 + di) % pairs.length];
        const tex = artTexture(a, b);
        if (!tex) return;
        owned.push(tex);
        const fr = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.05, 1.5), metal);
        fr.position.set(side * (hw - 0.05), 1.8, zc + dz * 1.9);
        g.add(fr);
        const am = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
        const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.85), am);
        pic.position.set(side * (hw - 0.085), 1.8, zc + dz * 1.9);
        pic.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        g.add(pic);
        owned.push(fr.geometry, pic.geometry, am);
      });
    });

    // floor lamps in the north corners (glow only; no extra light cost)
    [-1, 1].forEach((side) => {
      const x = side * (room.hw - 0.2);
      const z = room.z0 + 0.35;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 1.7, 8), metal);
      pole.position.set(x, 0.85, z);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 16), metal);
      base.position.set(x, 0.025, z);
      const shadeM = new THREE.MeshBasicMaterial({ color: 0xffe2b0 });
      const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.36, 16, 1, true), shadeM);
      lampShade.material.side = THREE.DoubleSide;
      lampShade.position.set(x, 1.85, z);
      g.add(pole, base, lampShade);
      lamps.push(lampShade);
      col.push({ x, z, w: 0.4, d: 0.4 });
      owned.push(pole.geometry, base.geometry, lampShade.geometry, shadeM);
    });
  };

  return {
    apply,
    prepare,
    update(t: number) {
      lamps.forEach((l, i) => (l.material as THREE.MeshBasicMaterial).color.setHex(0xffe2b0).multiplyScalar(0.92 + Math.sin(t * 0.0013 + i * 2) * 0.06));
    },
    dispose() {
      owned.forEach((o) => o.dispose());
      envRT?.dispose();
      scene.environment = null;
    },
  };
}
