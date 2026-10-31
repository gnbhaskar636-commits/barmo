import * as THREE from "three";
import type { RoomDef } from "@/lib/world/rooms";
import type { VideoSrc } from "@/lib/world/screens";

/** The big screen of each world: where it hangs, how big it is, and which way it faces. */
export interface VideoSpec {
  x: number; y: number; z: number; w: number; h: number;
  /** Rotation around Y. 0 = faces +z (north wall), PI/2 = faces +x (west wall). */
  rotY: number;
  /** True when this world has no screen yet and one should be built. */
  draw: boolean;
}

export function videoSpec(room: RoomDef): VideoSpec {
  const PI = Math.PI;
  if (room.id === "party") return { x: -(room.hw + 0.6) + 0.16, y: 2.9, z: 2.5, w: 5.6, h: 3.15, rotY: PI / 2, draw: false };
  if (room.id === "meeting" || room.id === "lab") return { x: 0, y: 3.0, z: room.z0 - 0.8 + 0.16, w: 5.46, h: 3.07, rotY: 0, draw: false };
  if (room.id === "cosmos") return { x: 0, y: 3.2, z: room.z0 - 1.6, w: 6.4, h: 3.6, rotY: 0, draw: true };
  return { x: 6.4, y: 2.9, z: -8.62, w: 4.8, h: 2.7, rotY: 0, draw: true }; // lounge: north wall, east of the idea wall
}

/** The four corners of the screen in world space: top-left, top-right, bottom-right, bottom-left as seen from the front. */
export function videoCorners(s: VideoSpec): THREE.Vector3[] {
  const c = new THREE.Vector3(s.x, s.y, s.z);
  const r = new THREE.Vector3(Math.cos(s.rotY), 0, -Math.sin(s.rotY)).multiplyScalar(s.w / 2);
  const u = new THREE.Vector3(0, s.h / 2, 0);
  return [c.clone().sub(r).add(u), c.clone().add(r).add(u), c.clone().add(r).sub(u), c.clone().sub(r).sub(u)];
}

/**
 * CSS matrix3d that stretches a w x h box (origin at its top-left) onto four screen points
 * (TL, TR, BR, BL) with correct perspective.
 */
export function quadMatrix(w: number, h: number, p: [number, number][]): string {
  const [x0, y0] = p[0], [x1, y1] = p[1], [x2, y2] = p[2], [x3, y3] = p[3];
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = den === 0 ? 0 : (dx3 * dy2 - dx2 * dy3) / den;
  const hh = den === 0 ? 0 : (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3;
  const d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3;
  const v = [a / w, d / w, 0, g / w, b / h, e / h, 0, hh / h, 0, 0, 1, 0, x0, y0, 0, 1];
  return `matrix3d(${v.join(",")})`;
}

/** A framed screen for worlds that have none (lounge, cosmos). Shows a hint until a link is shared. */
export function addVideoWall(scene: THREE.Scene, room: RoomDef, s: VideoSpec) {
  const cv = document.createElement("canvas");
  cv.width = 1024;
  cv.height = Math.round(1024 * (s.h / s.w));
  const cx = cv.getContext("2d");
  if (cx) {
    const g = cx.createLinearGradient(0, 0, cv.width, cv.height);
    g.addColorStop(0, "#0a0c18");
    g.addColorStop(1, "#171230");
    cx.fillStyle = g;
    cx.fillRect(0, 0, cv.width, cv.height);
    const hex = "#" + room.color.toString(16).padStart(6, "0");
    cx.strokeStyle = hex;
    cx.lineWidth = 6;
    cx.strokeRect(14, 14, cv.width - 28, cv.height - 28);
    cx.fillStyle = hex;
    cx.font = "700 54px system-ui, sans-serif";
    cx.textAlign = "center";
    cx.fillText("📺 SHARED SCREEN", cv.width / 2, cv.height / 2 - 20);
    cx.fillStyle = "#cfcbe0";
    cx.font = "500 32px system-ui, sans-serif";
    cx.fillText("Open Actions, paste a YouTube or video link,", cv.width / 2, cv.height / 2 + 36);
    cx.fillText("and everyone here watches it together.", cv.width / 2, cv.height / 2 + 80);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group();
  g.name = "videowall";
  g.position.set(s.x, s.y, s.z - 0.03);
  g.rotation.y = s.rotY;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  const frame = new THREE.Mesh(new THREE.BoxGeometry(s.w + 0.3, s.h + 0.3, 0.1), new THREE.MeshStandardMaterial({ color: 0x12141f, roughness: 0.4, metalness: 0.7 }));
  frame.position.z = -0.06;
  const glow = new THREE.Mesh(new THREE.BoxGeometry(s.w + 0.36, 0.05, 0.12), new THREE.MeshBasicMaterial({ color: room.color }));
  glow.position.set(0, -(s.h + 0.3) / 2 - 0.03, -0.05);
  g.add(frame, face, glow);
  scene.add(g);
  return {
    dispose() {
      scene.remove(g);
      tex.dispose();
      [face, frame, glow].forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
    },
  };
}

/**
 * Puts a real video player ON the 3D screen: a normal iframe/video element that is re-projected every
 * frame so it sits exactly on the screen from wherever the camera is. Everyone in the room sees it,
 * seated or standing. (It is drawn above the 3D view, so people walking in front of it do not hide it.)
 */
export function makeVideoOverlay(host: HTMLElement, camera: THREE.PerspectiveCamera, spec: VideoSpec) {
  const layer = document.createElement("div");
  layer.className = "vlayer";
  layer.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:2";
  host.appendChild(layer);
  const W = 960, H = 540;
  const corners = videoCorners(spec);
  const centre = new THREE.Vector3(spec.x, spec.y, spec.z);
  const normal = new THREE.Vector3(Math.sin(spec.rotY), 0, Math.cos(spec.rotY));
  let el: HTMLIFrameElement | HTMLVideoElement | null = null;
  let current = "";
  let wanted: VideoSrc | null = null;
  let interactive = false;
  let hidden = false;
  const v = new THREE.Vector3();
  const pts: [number, number][] = [[0, 0], [0, 0], [0, 0], [0, 0]];

  const style = (e: HTMLElement) => {
    e.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;border:0;background:#000;transform-origin:0 0;visibility:hidden;pointer-events:none`;
  };
  const remove = () => {
    if (el) {
      if (el instanceof HTMLVideoElement) el.pause();
      el.remove();
    }
    el = null;
    current = "";
  };

  const mount = (src: VideoSrc) => {
      if (src.src === current) return;
      remove();
      current = src.src;
      if (src.kind === "embed") {
        const f = document.createElement("iframe");
        f.src = src.src;
        f.title = src.label;
        f.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
        f.allowFullscreen = true;
        f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");
        f.referrerPolicy = "strict-origin-when-cross-origin";
        style(f);
        layer.appendChild(f);
        el = f;
      } else {
        const vd = document.createElement("video");
        vd.src = src.src;
        vd.playsInline = true;
        vd.controls = true;
        vd.loop = true;
        style(vd);
        layer.appendChild(vd);
        // Sound can be blocked until someone interacts; fall back to muted so it still plays.
        vd.play().catch(() => {
          vd.muted = true;
          void vd.play().catch(() => {});
        });
        el = vd;
      }
      el.style.pointerEvents = interactive ? "auto" : "none";
  };

  return {
    active: () => !!el,
    set(src: VideoSrc | null) {
      wanted = src;
      if (!src) return remove();
      if (!hidden) mount(src);
    },
    setInteractive(on: boolean) {
      interactive = on;
      if (el) el.style.pointerEvents = on ? "auto" : "none";
    },
    /** Hiding removes the player completely (so it stops making sound); showing it again restarts it. */
    setHidden(h: boolean) {
      hidden = h;
      if (h) remove();
      else if (wanted) mount(wanted);
    },
    /** Call once per frame (after the camera has moved). */
    update() {
      if (!el) return;
      camera.updateMatrixWorld();
      const cw = host.clientWidth, ch = host.clientHeight;
      let ok = !hidden && cw > 0 && ch > 0;
      if (ok) {
        // we must be in front of the screen, looking at it, with every corner in front of the camera
        ok = normal.dot(v.copy(camera.position).sub(centre)) > 0.15;
      }
      if (ok) {
        for (let i = 0; i < 4; i++) {
          v.copy(corners[i]).applyMatrix4(camera.matrixWorldInverse);
          if (v.z > -0.15) {
            ok = false;
            break;
          }
          v.copy(corners[i]).project(camera);
          pts[i] = [(v.x * 0.5 + 0.5) * cw, (-v.y * 0.5 + 0.5) * ch];
        }
      }
      if (!ok) {
        el.style.visibility = "hidden";
        return;
      }
      el.style.transform = quadMatrix(W, H, pts);
      el.style.visibility = "visible";
    },
    dispose() {
      remove();
      layer.remove();
    },
  };
}
