import type { BeatInfo } from "@/lib/world/music";

/**
 * Every song has a "scene": the colours, light show and mood the whole room takes on while it plays.
 * Pure data (no three.js). Everyone derives the scene from the track id, so it stays in sync for free.
 */
export interface MusicScene {
  id: string;
  /** Short mood line shown in the DJ deck and the now-playing chip. */
  vibe: string;
  /** Colours for spot lights, light cones, lasers and the dance floor. */
  palette: number[];
  /** Orb, ripples and floor ring colour. */
  accent: number;
  /** Background tint (one of the Lumen Orb theme ids) used while this song plays. */
  theme: "midnight" | "aurora" | "sunset" | "neon";
  /** How the dance floor lights up. */
  floor: "rainbow" | "wave" | "checker" | "rows" | "pulse";
  /** Sweeping laser beams (0 to 6). */
  lasers: number;
  /** Disco ball spin speed multiplier. */
  ball: number;
  /** How hard the camera and glow punch on the beat (0 to 1). */
  punch: number;
}

export const SCENES: Record<string, MusicScene> = {
  chill: { id: "chill", vibe: "Moonlit and slow", palette: [0x6b8cff, 0x9d7bff, 0x5ef2c8], accent: 0x7b9cff, theme: "aurora", floor: "wave", lasers: 0, ball: 0.5, punch: 0.25 },
  groove: { id: "groove", vibe: "Neon disco", palette: [0xff3ec8, 0x3ec8ff, 0x9dff3e, 0xffd34d], accent: 0xff3ec8, theme: "neon", floor: "rainbow", lasers: 4, ball: 1.2, punch: 0.7 },
  arcade: { id: "arcade", vibe: "8-bit arcade", palette: [0xffd34d, 0xff4a4a, 0x4aff8a, 0x4a9dff], accent: 0xffd34d, theme: "midnight", floor: "checker", lasers: 2, ball: 1.6, punch: 0.8 },
  aurora: { id: "aurora", vibe: "Northern lights", palette: [0x5ef2c8, 0x6bb5ff, 0xc45cff], accent: 0x5ef2c8, theme: "aurora", floor: "wave", lasers: 0, ball: 0.3, punch: 0.15 },
  synth: { id: "synth", vibe: "Sunset synthwave", palette: [0xff5a7a, 0xff9a4d, 0xc45cff, 0x4dd0ff], accent: 0xff7a5c, theme: "sunset", floor: "rows", lasers: 3, ball: 0.8, punch: 0.55 },
  lofi: { id: "lofi", vibe: "Cosy rainy night", palette: [0xffb86b, 0xff8a5c, 0xc8a26b], accent: 0xffb86b, theme: "sunset", floor: "pulse", lasers: 0, ball: 0.4, punch: 0.3 },
  techno: { id: "techno", vibe: "Underground techno", palette: [0x39ff7a, 0x3ec8ff, 0xffffff, 0xc45cff], accent: 0x39ff7a, theme: "neon", floor: "checker", lasers: 6, ball: 1.8, punch: 1 },
  fiesta: { id: "fiesta", vibe: "Summer fiesta", palette: [0xffd34d, 0xff5ac8, 0x5ef2c8, 0xff8a3d], accent: 0xff5ac8, theme: "sunset", floor: "rainbow", lasers: 2, ball: 1.4, punch: 0.75 },
};

export const sceneFor = (trackId: string | null | undefined): MusicScene | null => (trackId ? SCENES[trackId] || null : null);

/** What the music is doing right now. Handed to every world every frame. */
export interface Mood {
  scene: MusicScene | null;
  /** Track name for the screens ("" when nothing plays). */
  name: string;
  level: number;
  bands: number[];
  beat: BeatInfo;
  /** True when the visitor asked their device for less motion: skip punches, ripples and flashes. */
  reduce: boolean;
}

export const NO_MOOD: Mood = { scene: null, name: "", level: 0, bands: [], beat: { step: 0, beat: 0, tick: 0 }, reduce: false };
