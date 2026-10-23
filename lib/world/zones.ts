/** Spots in the lounge. (x,z) = where the label floats; (sx,sz) = where "Go there" puts you. */
export interface Zone { id: string; name: string; icon: string; x: number; z: number; sx: number; sz: number }

export const ZONES: Zone[] = [
  { id: "coffee", name: "Coffee bar", icon: "☕", x: -6, z: -6, sx: -6, sz: -4.3 },
  { id: "games", name: "Game table", icon: "🎲", x: -6, z: 2, sx: -4.2, sz: 2 },
  { id: "ideas", name: "Idea wall", icon: "💡", x: 0, z: -8.5, sx: 0, sz: -6.5 },
  { id: "chill", name: "Chill zone", icon: "🛋️", x: 3, z: 1, sx: 3, sz: 0 },
  { id: "orb", name: "Lumen Orb", icon: "🔮", x: -1.5, z: -2.2, sx: -1.5, sz: -0.5 },
  { id: "pod", name: "Meeting pod", icon: "🤝", x: 8.8, z: -5.7, sx: 8.8, sz: -4.2 },
  { id: "roof", name: "Rooftop", icon: "🌆", x: 0, z: 14, sx: 0, sz: 10.5 },
];
