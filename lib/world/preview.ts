import * as THREE from "three";
import { makeAvatar, type AvatarConfig } from "@/lib/world/avatar";
import { pose } from "@/lib/world/world";

/** A small turntable viewer for the avatar studio. Drag to rotate. */
export function runPreview(host: HTMLElement, cfg: AvatarConfig) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);
  renderer.domElement.style.touchAction = "none";

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xb8c0e0, 1.7));
  const key = new THREE.DirectionalLight(0xfff1d6, 2.4);
  key.position.set(3, 5, 4);
  const rim = new THREE.DirectionalLight(0x8fa3c9, 1.4);
  rim.position.set(-4, 3, -3);
  scene.add(key, rim);

  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.95, 0.04, 48),
    new THREE.MeshStandardMaterial({ color: 0x1b2030, roughness: 0.35, metalness: 0.6 })
  );
  disc.position.y = -0.02;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.93, 0.012, 8, 64), new THREE.MeshBasicMaterial({ color: 0xc8a26b }));
  ring.rotation.x = Math.PI / 2;
  scene.add(disc, ring);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
  camera.position.set(0, 1.25, 4.1);
  camera.lookAt(0, 0.95, 0);

  let av = makeAvatar(cfg);
  scene.add(av);
  let spin = 0.35;
  let dragging = false;
  let lx = 0;
  let last = performance.now();
  let raf = 0;

  const down = (e: PointerEvent) => { dragging = true; lx = e.clientX; };
  const move = (e: PointerEvent) => { if (dragging) { av.rotation.y += (e.clientX - lx) * 0.012; lx = e.clientX; } };
  const up = () => { dragging = false; };
  const cv = renderer.domElement;
  cv.addEventListener("pointerdown", down);
  cv.addEventListener("pointermove", move);
  addEventListener("pointerup", up);

  function size() {
    const w = host.clientWidth, h = host.clientHeight || 360;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  size();
  const ro = new ResizeObserver(size);
  ro.observe(host);

  function disposeAv(g: THREE.Group) {
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) (m.material as THREE.Material).dispose();
    });
  }

  function loop(t: number) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;
    if (!dragging) av.rotation.y += dt * spin;
    pose(av, false, t);
    ring.rotation.z = t * 0.0005;
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(loop);

  return {
    set(next: AvatarConfig) {
      const ry = av.rotation.y;
      scene.remove(av);
      disposeAv(av);
      av = makeAvatar(next);
      av.rotation.y = ry;
      scene.add(av);
    },
    emote(e: string) {
      av.userData.emote = e;
      av.userData.until = performance.now() + 2800;
    },
    destroy() {
      cancelAnimationFrame(raf);
      removeEventListener("pointerup", up);
      ro.disconnect();
      disposeAv(av);
      disc.geometry.dispose();
      renderer.dispose();
      cv.remove();
    },
  };
}
