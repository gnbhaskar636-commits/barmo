import * as THREE from "three";
import type { Mood } from "@/lib/world/scenes";

const hex = (c: number) => "#" + c.toString(16).padStart(6, "0");

/**
 * A big club screen drawn on a canvas: song name plus a live equaliser in the song's colours.
 * Redraws about 20 times a second so it stays cheap on phones.
 */
export function makeVisualScreen(idleTitle: string, idleLine: string, accent: number) {
  const cv = document.createElement("canvas");
  cv.width = 1024;
  cv.height = 384;
  const cx = cv.getContext("2d");
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  let last = 0;
  const BARS = 32;

  const draw = (t: number, mood: Mood) => {
    if (!cx || t - last < 50) return;
    last = t;
    const sc = mood.scene;
    const pal = (sc?.palette || [accent]).map(hex);
    const top = mood.scene ? hex(sc!.accent) : hex(accent);
    const g = cx.createLinearGradient(0, 0, 1024, 384);
    g.addColorStop(0, "#080612");
    g.addColorStop(1, "#150c24");
    cx.fillStyle = g;
    cx.fillRect(0, 0, 1024, 384);
    // soft flash on the beat
    if (sc && !mood.reduce) {
      cx.fillStyle = top;
      cx.globalAlpha = Math.min(0.22, mood.beat.beat * 0.22 * (0.4 + sc.punch));
      cx.fillRect(0, 0, 1024, 384);
      cx.globalAlpha = 1;
    }
    cx.strokeStyle = top;
    cx.lineWidth = 6;
    cx.strokeRect(12, 12, 1000, 360);
    cx.fillStyle = top;
    cx.font = "700 34px system-ui, sans-serif";
    cx.fillText(sc ? "NOW PLAYING" : idleTitle, 44, 78);
    cx.fillStyle = "#ffffff";
    cx.font = "700 58px system-ui, sans-serif";
    cx.fillText((sc ? mood.name : idleLine).slice(0, 26), 44, 146);
    if (sc) {
      cx.fillStyle = "#b9b4cc";
      cx.font = "500 30px system-ui, sans-serif";
      cx.fillText(sc.vibe, 44, 190);
    }
    // equaliser
    const bw = 1024 / (BARS + 3);
    for (let i = 0; i < BARS; i++) {
      const band = mood.bands.length ? mood.bands[Math.floor((i / BARS) * mood.bands.length)] || 0 : 0;
      const idle = 0.05 + (Math.sin(t * 0.002 + i * 0.5) + 1) * 0.03;
      const v = sc ? Math.max(band, 0.04) : idle;
      const h = 12 + v * 190;
      cx.fillStyle = pal[i % pal.length];
      cx.fillRect(40 + i * bw, 350 - h, bw - 6, h);
    }
    tex.needsUpdate = true;
  };

  return { tex, draw, dispose: () => tex.dispose() };
}
