import { getCtx, soundOn } from "@/lib/sound";

/** A tiny generative step sequencer. Every client synthesises the same track locally; nothing is streamed. */
export interface Track {
  id: string;
  name: string;
  icon: string;
  bpm: number;
  root: number;
  scale: number[];
  bass: number[];
  arp: number[];
  kick: number[];
  hat: number[];
  lead: OscillatorType;
  pad?: boolean;
}

const _ = -1;
export const TRACKS: Track[] = [
  {
    id: "chill", name: "Midnight Chill", icon: "🌙", bpm: 78, root: 110, scale: [0, 3, 5, 7, 10], lead: "triangle",
    bass: [0, _, _, 0, _, _, 2, _, 3, _, _, 3, _, 2, _, _],
    arp: [4, _, 5, _, 7, _, 5, _, 4, _, 3, _, 5, _, 2, _],
    kick: [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0],
  },
  {
    id: "groove", name: "Neon Groove", icon: "🪩", bpm: 112, root: 98, scale: [0, 2, 3, 5, 7, 9, 10], lead: "sawtooth",
    bass: [0, _, 0, _, 3, _, 3, _, 2, _, 2, _, 5, _, 4, _],
    arp: [7, _, 9, 7, _, 9, 11, _, 7, _, 9, 7, _, 5, _, 4],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1],
  },
  {
    id: "arcade", name: "Arcade Run", icon: "👾", bpm: 140, root: 130.8, scale: [0, 2, 4, 5, 7, 9, 11], lead: "square",
    bass: [0, _, 0, _, 4, _, 4, _, 3, _, 3, _, 4, _, 2, _],
    arp: [7, 9, 11, 9, 7, 9, 11, 14, 12, 11, 9, 11, 7, 9, 5, 7],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0],
    hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
  },
  {
    id: "aurora", name: "Aurora Ambient", icon: "🌌", bpm: 56, root: 87.3, scale: [0, 2, 4, 7, 9], lead: "sine", pad: true,
    bass: [0, _, _, _, _, _, _, _, 3, _, _, _, _, _, _, _],
    arp: [4, _, _, 7, _, _, 9, _, _, 7, _, _, 5, _, _, _],
    kick: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    hat: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  },
  {
    id: "synth", name: "Sunset Drive", icon: "🌆", bpm: 100, root: 110, scale: [0, 2, 3, 5, 7, 8, 10], lead: "sawtooth",
    bass: [0, _, 0, _, _, 0, _, 0, 3, _, 3, _, _, 3, _, 2],
    arp: [4, _, 6, _, 4, _, 7, _, 6, _, 4, _, 2, _, 4, _],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
  },
  {
    id: "lofi", name: "Lo-fi Rain", icon: "☔", bpm: 72, root: 98, scale: [0, 2, 4, 7, 9], lead: "triangle",
    bass: [0, _, _, _, _, _, 2, _, 3, _, _, _, _, _, 2, _],
    arp: [4, _, _, 2, _, _, 4, _, 5, _, _, 4, _, 2, _, _],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1],
  },
  {
    id: "techno", name: "Techno Pulse", icon: "🔊", bpm: 128, root: 65.4, scale: [0, 1, 3, 5, 7, 8, 10], lead: "square",
    bass: [0, _, 0, 0, _, 0, _, 0, 0, _, 0, 0, _, 0, _, 3],
    arp: [7, _, _, 7, _, _, 10, _, _, 7, _, _, 12, _, 5, _],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
  },
  {
    id: "fiesta", name: "Fiesta", icon: "🌴", bpm: 104, root: 123.5, scale: [0, 2, 4, 5, 7, 9, 11], lead: "triangle",
    bass: [0, _, _, 0, _, _, 4, _, 3, _, _, 3, _, _, 4, _],
    arp: [7, _, 9, _, 11, 9, _, 7, _, 9, _, 11, 12, _, 11, _],
    kick: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0],
    hat: [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1],
  },
];

let master: GainNode | null = null;
let analyser: AnalyserNode | null = null;
let data: Uint8Array<ArrayBuffer> | null = null;
let noise: AudioBuffer | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
let cur: Track | null = null;
let step = 0;
let nextT = 0;
let vol = 0.55;
// Beat clock for visuals: the scheduler records every step it queues; musicBeat() reads them back at the right audio time.
const pending: { t: number; step: number; beat: boolean }[] = [];
let lastStep = 0;
let lastStepT = -10;
let lastBeatT = -10;

const freq = (t: Track, deg: number, oct = 0) => {
  const n = t.scale.length;
  const semi = t.scale[((deg % n) + n) % n] + 12 * Math.floor(deg / n) + 12 * oct;
  return t.root * Math.pow(2, semi / 12);
};

function graph() {
  const c = getCtx();
  if (!c) return null;
  if (!master) {
    master = c.createGain();
    master.gain.value = vol;
    analyser = c.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.75;
    data = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    master.connect(analyser);
    analyser.connect(c.destination);
    noise = c.createBuffer(1, Math.floor(c.sampleRate * 0.08), c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return c;
}

function osc(c: AudioContext, type: OscillatorType, f: number, t: number, dur: number, gain: number, cutoff?: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node: AudioNode = o;
  if (cutoff) {
    const fl = c.createBiquadFilter();
    fl.type = "lowpass";
    fl.frequency.value = cutoff;
    o.connect(fl);
    node = fl;
  }
  node.connect(g);
  g.connect(master!);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function schedule(c: AudioContext, tr: Track, s: number, t: number, sd: number) {
  if (tr.kick[s]) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g);
    g.connect(master!);
    o.start(t);
    o.stop(t + 0.25);
  }
  if (tr.hat[s] && noise) {
    const n = c.createBufferSource();
    n.buffer = noise;
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const g = c.createGain();
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    n.connect(hp);
    hp.connect(g);
    g.connect(master!);
    n.start(t);
  }
  if (tr.bass[s] >= 0) osc(c, "sawtooth", freq(tr, tr.bass[s]), t, sd * 1.7, 0.32, 380);
  if (tr.arp[s] >= 0) osc(c, tr.lead, freq(tr, tr.arp[s], 1), t, sd * (tr.pad ? 3 : 0.95), tr.lead === "sine" ? 0.2 : 0.1, tr.lead === "sawtooth" ? 2400 : undefined);
  if (tr.pad && s % 8 === 0) [0, 2, 4].forEach((d) => osc(c, "triangle", freq(tr, tr.bass[0 + (s ? 8 : 0)] + d, 1), t, sd * 8, 0.07));
}

export function playing(): string | null {
  return cur?.id ?? null;
}

/** The track that is playing right now (or null). */
export const currentTrack = (): Track | null => cur;

export interface BeatInfo {
  /** Which of the 16 steps just played. */
  step: number;
  /** 1 on a kick / downbeat, then fades to 0 (for big pulses). */
  beat: number;
  /** 1 on every step, fades fast (for small flickers). */
  tick: number;
}
const NO_BEAT: BeatInfo = { step: 0, beat: 0, tick: 0 };
/** Beat pulse that follows the real audio clock. Safe to call every frame; returns zeros when nothing plays. */
export function musicBeat(): BeatInfo {
  const c = getCtx();
  if (!c || !cur) return NO_BEAT;
  const now = c.currentTime;
  while (pending.length && pending[0].t <= now) {
    const p = pending.shift()!;
    lastStep = p.step;
    lastStepT = p.t;
    if (p.beat) lastBeatT = p.t;
  }
  return { step: lastStep, beat: Math.exp(-Math.max(0, now - lastBeatT) * 7), tick: Math.exp(-Math.max(0, now - lastStepT) * 16) };
}

export function startTrack(id: string) {
  const tr = TRACKS.find((x) => x.id === id);
  if (!tr || !soundOn()) return;
  if (cur?.id === id) return;
  const c = graph();
  if (!c) return;
  stopTrack(true);
  cur = tr;
  step = 0;
  nextT = c.currentTime + 0.08;
  const sd = 60 / tr.bpm / 4;
  timer = setInterval(() => {
    const cc = getCtx();
    if (!cc || !cur) return;
    while (nextT < cc.currentTime + 0.15) {
      schedule(cc, cur, step, nextT, sd);
      const noKick = !cur.kick.some((k) => k === 1);
      pending.push({ t: nextT, step, beat: cur.kick[step] === 1 || (noKick && step % 4 === 0) });
      if (pending.length > 64) pending.shift();
      nextT += sd;
      step = (step + 1) % 16;
    }
  }, 30);
}

export function stopTrack(keepGraph = false) {
  if (timer) clearInterval(timer);
  timer = undefined;
  cur = null;
  pending.length = 0;
  void keepGraph;
}

export function setMusicVolume(v: number) {
  vol = Math.min(1, Math.max(0, v));
  if (master) master.gain.value = vol;
}
export const musicVolume = () => vol;

/** Overall energy 0..1 (for pulsing visuals). */
export function musicLevel(): number {
  if (!analyser || !data || !cur) return 0;
  analyser.getByteFrequencyData(data);
  let s = 0;
  const n = Math.min(10, data.length);
  for (let i = 0; i < n; i++) s += data[i];
  return Math.min(1, s / (n * 200));
}

/** `n` frequency bands 0..1 (for the equaliser ring). */
export function musicBands(n: number): number[] {
  const out = new Array(n).fill(0);
  if (!analyser || !data || !cur) return out;
  analyser.getByteFrequencyData(data);
  const usable = Math.floor(data.length * 0.7);
  for (let i = 0; i < n; i++) {
    const a = Math.floor((i / n) * usable), b = Math.max(a + 1, Math.floor(((i + 1) / n) * usable));
    let s = 0;
    for (let k = a; k < b; k++) s += data[k];
    out[i] = Math.min(1, s / ((b - a) * 190));
  }
  return out;
}
