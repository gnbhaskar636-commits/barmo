import { load, save } from "@/lib/social/store";
import { useSyncExternalStore } from "react";

/**
 * Procedural WebAudio Synthesizer Engine.
 * Pure synthesis with zero audio assets, instant playback, zero network overhead.
 */
let ctx: AudioContext | null = null;
let on: boolean | null = null;
let masterVol: number | null = null;

export type SoundChannel = "sfx" | "ui" | "ambient";

const channelVols: Record<SoundChannel, number> = {
  sfx: 0.8,
  ui: 0.7,
  ambient: 0.5,
};

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}

export function soundOn(): boolean {
  if (on === null) on = load<boolean>("sound", true);
  return on;
}

export function setSound(v: boolean) {
  on = v;
  save("sound", v);
  notify();
}

export function getVolume(): number {
  if (masterVol === null) {
    const saved = load<number>("volume", 0.8);
    masterVol = typeof saved === "number" && !isNaN(saved) ? Math.max(0, Math.min(1, saved)) : 0.8;
  }
  return masterVol;
}

export function setVolume(v: number) {
  if (isNaN(v)) {
    masterVol = 0.8;
  } else {
    masterVol = Math.max(0, Math.min(1, v));
  }
  save("volume", masterVol);
  notify();
}

export function getChannelVolume(ch: SoundChannel): number {
  return channelVols[ch] ?? 0.8;
}

export function setChannelVolume(ch: SoundChannel, v: number) {
  if (!isNaN(v)) {
    channelVols[ch] = Math.max(0, Math.min(1, v));
    notify();
  }
}

export function _resetAudioContext(): void {
  ctx = null;
}

export function getCtx(): AudioContext | null {
  return ac();
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") {
    ctx = null;
    return null;
  }
  try {
    if (!ctx) {
      const C =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    return ctx;
  } catch {
    ctx = null;
    return null;
  }
}

export interface ADSR {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  peakGain: number;
}

/**
 * Procedural Tone Generator with exponential gain envelope scheduling.
 */
export function tone(
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType = "sine",
  vol = 0.06,
  ch: SoundChannel = "sfx"
) {
  if (
    !Number.isFinite(freq) ||
    freq <= 0 ||
    !Number.isFinite(dur) ||
    dur <= 0 ||
    !Number.isFinite(start) ||
    start < 0
  ) {
    return;
  }
  if (!soundOn()) return;
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = c.currentTime + start;

  // Scale volume by master and channel attenuation
  const safeVol = Number.isFinite(vol) ? vol : 0.06;
  const effVol = Math.max(0.0001, safeVol * getVolume() * getChannelVolume(ch));
  const attack = Math.min(0.015, dur * 0.4);

  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(effVol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

/**
 * Procedural ADSR Envelope Tone Generator.
 */
export function toneADSR(
  freq: number,
  start: number,
  adsr: ADSR,
  type: OscillatorType = "sine",
  ch: SoundChannel = "sfx"
) {
  if (!adsr || !Number.isFinite(freq) || freq <= 0 || !Number.isFinite(start) || start < 0) return;
  if (!soundOn()) return;
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = c.currentTime + start;

  const effVol = getVolume() * getChannelVolume(ch);
  const atk = Math.max(0.005, Number.isFinite(adsr.attack) ? adsr.attack : 0.005);
  const dec = Math.max(0.005, Number.isFinite(adsr.decay) ? adsr.decay : 0.005);
  const rel = Math.max(0.005, Number.isFinite(adsr.release) ? adsr.release : 0.005);
  const peak = Math.max(0.0001, (Number.isFinite(adsr.peakGain) ? adsr.peakGain : 0.1) * effVol);
  const sus = Math.max(0.0001, peak * (Number.isFinite(adsr.sustain) ? adsr.sustain : 0.05));

  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + atk);
  g.gain.exponentialRampToValueAtTime(sus, t0 + atk + dec);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + atk + dec + rel);

  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + atk + dec + rel + 0.05);
}

/**
 * Procedural White Noise Generator for percussive gaming SFX (dice shuffles, whooshes, slipstreams).
 */
export function noise(
  start: number,
  dur: number,
  filterFreq = 1200,
  vol = 0.05,
  ch: SoundChannel = "sfx"
) {
  if (!Number.isFinite(dur) || dur <= 0 || !Number.isFinite(start) || start < 0) return;
  if (!soundOn()) return;
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + start;
  const bufferSize = Math.max(1, Math.floor(c.sampleRate * Math.min(dur, 2)));
  const safeFilterFreq = Number.isFinite(filterFreq) && filterFreq > 0 ? filterFreq : 1200;
  const safeVol = Number.isFinite(vol) ? vol : 0.05;

  try {
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = c.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = safeFilterFreq;

    const g = c.createGain();
    const effVol = Math.max(0.0001, safeVol * getVolume() * getChannelVolume(ch));
    const attack = Math.min(0.01, dur * 0.4);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(effVol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    whiteNoise.connect(filter);
    filter.connect(g);
    g.connect(c.destination);

    whiteNoise.start(t0);
    whiteNoise.stop(t0 + dur + 0.02);
  } catch {
    // Fallback to filtered low tone if AudioBuffer creation fails
    tone(safeFilterFreq * 0.25, start, dur, "sawtooth", safeVol, ch);
  }
}

export type Sfx =
  // Baseline Presets (Strictly preserved for exact frequency matching)
  | "pop"
  | "notify"
  | "win"
  | "lose"
  | "tick"
  | "go"
  | "roll"
  | "wave"
  | "teleport"
  | "level"
  | "hover"
  // UI & System
  | "click"
  | "modal_open"
  | "tab_switch"
  // Progression & Economy
  | "badge_unlock"
  | "purchase_success"
  | "purchase_fail"
  // World & Social
  | "chat_ping"
  // Games & Competition
  | "dice_roll"
  | "dice_double"
  | "dice_jackpot"
  | "quiz_correct"
  | "quiz_wrong"
  | "warp_charge"
  | "nitro_boost"
  | "cipher_click"
  | "matrix_unlock"
  | "speedrun_pass"
  | "speedrun_fail";

export function play(k: Sfx) {
  if (!soundOn()) return;
  switch (k) {
    // Baseline Presets
    case "pop":
      tone(660, 0, 0.09, "triangle", 0.06, "ui");
      break;
    case "notify":
      tone(880, 0, 0.12, "sine", 0.06, "ui");
      tone(1175, 0.12, 0.18, "sine", 0.06, "ui");
      break;
    case "win":
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.22, "triangle", 0.07, "sfx"));
      break;
    case "lose":
      tone(330, 0, 0.2, "sawtooth", 0.04, "sfx");
      tone(247, 0.18, 0.3, "sawtooth", 0.04, "sfx");
      break;
    case "tick":
      tone(1200, 0, 0.03, "sine", 0.03, "ui");
      break;
    case "go":
      tone(440, 0, 0.1, "sine", 0.06, "sfx");
      tone(880, 0.08, 0.25, "sine", 0.06, "sfx");
      break;
    case "roll":
      tone(300, 0, 0.05, "triangle", 0.06, "sfx");
      tone(450, 0.05, 0.05, "triangle", 0.06, "sfx");
      tone(600, 0.1, 0.08, "triangle", 0.06, "sfx");
      break;
    case "wave":
      [587, 740, 880].forEach((f, i) => tone(f, i * 0.08, 0.2, "sine", 0.05, "sfx"));
      break;
    case "teleport":
      [220, 440, 880, 1760].forEach((f, i) => tone(f, i * 0.06, 0.18, "sine", 0.05, "sfx"));
      break;
    case "level":
      [440, 554, 659, 880, 1108].forEach((f, i) => tone(f, i * 0.07, 0.25, "triangle", 0.06, "sfx"));
      break;
    case "hover":
      tone(1400, 0, 0.02, "sine", 0.015, "ui");
      break;

    // UI & System Presets
    case "click":
      tone(900, 0, 0.02, "sine", 0.03, "ui");
      break;
    case "modal_open":
      tone(500, 0, 0.06, "sine", 0.04, "ui");
      tone(750, 0.04, 0.08, "sine", 0.04, "ui");
      break;
    case "tab_switch":
      tone(800, 0, 0.03, "triangle", 0.03, "ui");
      break;

    // Progression & Economy Presets
    case "badge_unlock":
      [523, 659, 784, 1047, 1318].forEach((f, i) => tone(f, i * 0.08, 0.2, "triangle", 0.06, "sfx"));
      break;
    case "purchase_success":
      [440, 554, 659, 880].forEach((f, i) => tone(f, i * 0.07, 0.18, "sine", 0.06, "sfx"));
      break;
    case "purchase_fail":
      tone(280, 0, 0.18, "sawtooth", 0.05, "sfx");
      tone(220, 0.12, 0.25, "sawtooth", 0.05, "sfx");
      break;

    // World & Social Presets
    case "chat_ping":
      tone(987, 0, 0.08, "sine", 0.04, "ui");
      tone(1318, 0.06, 0.12, "sine", 0.04, "ui");
      break;

    // Games & Competition Presets
    case "dice_roll":
      tone(260, 0, 0.04, "triangle", 0.05, "sfx");
      tone(390, 0.04, 0.05, "triangle", 0.05, "sfx");
      tone(520, 0.08, 0.06, "triangle", 0.05, "sfx");
      break;
    case "dice_double":
      [440, 660, 880].forEach((f, i) => tone(f, i * 0.06, 0.15, "triangle", 0.06, "sfx"));
      break;
    case "dice_jackpot":
      [523, 659, 784, 1047, 1318, 1568].forEach((f, i) => tone(f, i * 0.08, 0.25, "triangle", 0.07, "sfx"));
      break;
    case "quiz_correct":
      tone(587, 0, 0.1, "sine", 0.06, "sfx");
      tone(880, 0.08, 0.2, "sine", 0.06, "sfx");
      break;
    case "quiz_wrong":
      tone(260, 0, 0.18, "sawtooth", 0.05, "sfx");
      tone(220, 0.12, 0.22, "sawtooth", 0.05, "sfx");
      break;
    case "warp_charge":
      [200, 350, 500, 750, 1100].forEach((f, i) => tone(f, i * 0.05, 0.12, "sawtooth", 0.04, "sfx"));
      break;
    case "nitro_boost":
      [300, 600, 900, 1200].forEach((f, i) => tone(f, i * 0.04, 0.1, "triangle", 0.06, "sfx"));
      break;
    case "cipher_click":
      tone(1500, 0, 0.02, "sine", 0.03, "ui");
      break;
    case "matrix_unlock":
      [440, 660, 880, 1320].forEach((f, i) => tone(f, i * 0.06, 0.16, "sine", 0.05, "sfx"));
      break;
    case "speedrun_pass":
      tone(523, 0, 0.1, "triangle", 0.06, "sfx");
      tone(784, 0.08, 0.2, "triangle", 0.06, "sfx");
      break;
    case "speedrun_fail":
      tone(311, 0, 0.16, "sawtooth", 0.05, "sfx");
      tone(233, 0.12, 0.25, "sawtooth", 0.05, "sfx");
      break;
  }
}

/**
 * Reactive React hook for component sound controls.
 */
export function useSound() {
  const isMuted = !useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => soundOn(),
    () => true
  );

  const vol = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => getVolume(),
    () => 0.8
  );

  return {
    soundOn: !isMuted,
    setSound,
    toggleSound: () => setSound(isMuted),
    volume: vol,
    setVolume,
    play,
  };
}
