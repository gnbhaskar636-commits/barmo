import { load, save } from "@/lib/social/store";

/** Tiny WebAudio synth: no audio files, no downloads. Respects a saved on/off switch. */
let ctx: AudioContext | null = null;
let on: boolean | null = null;

export function soundOn(): boolean {
  if (on === null) on = load<boolean>("sound", true);
  return on;
}
export function setSound(v: boolean) {
  on = v;
  save("sound", v);
}

export function getCtx(): AudioContext | null {
  return ac();
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.06) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export type Sfx = "pop" | "notify" | "win" | "lose" | "tick" | "go" | "roll" | "wave";

export function play(k: Sfx) {
  if (!soundOn()) return;
  switch (k) {
    case "pop": tone(660, 0, 0.09, "triangle"); break;
    case "notify": tone(880, 0, 0.12, "sine"); tone(1175, 0.12, 0.18, "sine"); break;
    case "win": [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.22, "triangle", 0.07)); break;
    case "lose": tone(330, 0, 0.2, "sawtooth", 0.04); tone(247, 0.18, 0.3, "sawtooth", 0.04); break;
    case "tick": tone(1000, 0, 0.04, "square", 0.03); break;
    case "go": tone(1318, 0, 0.18, "square", 0.05); break;
    case "roll": for (let i = 0; i < 5; i++) tone(300 + Math.random() * 400, i * 0.05, 0.05, "square", 0.03); break;
    case "wave": tone(740, 0, 0.08, "sine"); tone(988, 0.08, 0.1, "sine"); break;
  }
}
