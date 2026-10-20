import { ZONES, type Zone } from "@/lib/world/zones";

/** The separate worlds people can walk between. Pure data (no three.js) so the UI can import it cheaply. */
export type RoomId = "lounge" | "meeting" | "party" | "lab" | "cosmos";

export interface Seat { id: string; x: number; z: number; yaw: number }
/** A glowing ring on the floor. Walk into it to travel. `face` = which way the ring turns (radians). */
export interface Portal { to: RoomId; x: number; z: number; face: number }
export interface Spawn { x: number; z: number; yaw: number }
/** A glowing circle on the floor. Everyone standing inside shares a private chat. */
export interface Huddle { id: string; name: string; x: number; z: number; r: number }

export interface RoomDef {
  id: RoomId;
  name: string;
  icon: string;
  tag: string;
  blurb: string;
  /** Accent colour (three.js hex). */
  color: number;
  /** Walkable area: |x| <= hw and z0 <= z <= z1 (the lounge has its own rules plus the rooftop). */
  hw: number;
  z0: number;
  z1: number;
  orb: { x: number; z: number };
  orbName: string;
  spawn: Spawn;
  /** Where you appear when you arrive from another world (in front of the ring you came through). */
  from?: Partial<Record<RoomId, Spawn>>;
  zones: Zone[];
  portals: Portal[];
  seats: Seat[];
  huddles: Huddle[];
  /** A shared screen everyone can write on. */
  board?: { title: string; text: string; accent: number };
}

const PI = Math.PI;
const BACK: Portal = { to: "lounge", x: 0, z: 7.6, face: 0 };

export const ROOMS: RoomDef[] = [
  {
    id: "lounge",
    name: "The Lounge",
    icon: "🏙️",
    tag: "Meet, chat and hang out",
    blurb: "The main hub. Coffee bar, idea wall, games and the rooftop. Portals on the west wall lead to the other worlds.",
    color: 0xc8a26b,
    hw: 11.3, z0: -8.3, z1: 8.3,
    orb: { x: -1.5, z: -2.2 },
    orbName: "Lumen Orb",
    spawn: { x: 0, z: 6, yaw: 0 },
    from: {
      meeting: { x: -8.2, z: -2.5, yaw: PI / 2 },
      party: { x: -8.2, z: 1.2, yaw: PI / 2 },
      lab: { x: -8.2, z: 4.9, yaw: PI / 2 },
      cosmos: { x: 8.2, z: 4.4, yaw: -PI / 2 },
    },
    zones: ZONES,
    portals: [
      { to: "meeting", x: -10.6, z: -2.5, face: PI / 2 },
      { to: "party", x: -10.6, z: 1.2, face: PI / 2 },
      { to: "lab", x: -10.6, z: 4.9, face: PI / 2 },
      { to: "cosmos", x: 10.6, z: 4.4, face: -PI / 2 },
    ],
    seats: [],
    huddles: [{ id: "pod", name: "Meeting pod", x: 8.8, z: -5.4, r: 1.5 }],
  },
  {
    id: "meeting",
    name: "Meeting Hall",
    icon: "🤝",
    tag: "Sit down and talk properly",
    blurb: "A conference room with a big table, 10 seats and a shared agenda screen. Sit, set a topic and have a real meeting.",
    color: 0x6bb5ff,
    hw: 9.2, z0: -8.2, z1: 8.0,
    orb: { x: 7.6, z: -6.2 },
    orbName: "Room console",
    spawn: { x: 0, z: 5.2, yaw: PI },
    zones: [
      { id: "table", name: "Meeting table", icon: "🤝", x: 0, z: 0, sx: 0, sz: 4.4 },
      { id: "screen", name: "Agenda screen", icon: "📋", x: 0, z: -8.2, sx: 0, sz: -5.6 },
      { id: "orb", name: "Room console", icon: "🎛️", x: 7.6, z: -6.2, sx: 7.6, sz: -4.4 },
    ],
    portals: [BACK],
    seats: [
      ...[-3, -1, 1, 3].map((x, i): Seat => ({ id: "n" + i, x, z: -2.05, yaw: 0 })),
      ...[-3, -1, 1, 3].map((x, i): Seat => ({ id: "s" + i, x, z: 2.05, yaw: PI })),
      { id: "w", x: -5.4, z: 0, yaw: PI / 2 },
      { id: "e", x: 5.4, z: 0, yaw: -PI / 2 },
    ],
    huddles: [
      { id: "a", name: "Huddle A", x: -6.6, z: -5.4, r: 1.8 },
      { id: "b", name: "Huddle B", x: -6.6, z: 5.2, r: 1.8 },
      { id: "c", name: "Huddle C", x: 6.4, z: 5.2, r: 1.8 },
    ],
    board: { title: "AGENDA", text: "Welcome. Take a seat, then set today's topic from Actions.", accent: 0x6bb5ff },
  },
  {
    id: "party",
    name: "Party Hall",
    icon: "🪩",
    tag: "Music, lights and dancing",
    blurb: "A dance floor with a disco ball, light show and a DJ deck. Pick a track, change the lights, set off confetti.",
    color: 0xff5ac8,
    hw: 10.2, z0: -8.2, z1: 8.0,
    orb: { x: 0, z: -5.2 },
    orbName: "DJ deck",
    spawn: { x: 0, z: 5.2, yaw: PI },
    zones: [
      { id: "floor", name: "Dance floor", icon: "💃", x: 0, z: 1, sx: 0, sz: 2 },
      { id: "orb", name: "DJ deck", icon: "🎧", x: 0, z: -5.2, sx: 0, sz: -3.6 },
      { id: "bar", name: "Juice bar", icon: "🍹", x: 8.6, z: 2.5, sx: 6.6, sz: 2.5 },
      { id: "couch", name: "Chill couches", icon: "🛋️", x: -8, z: 2.5, sx: -5.4, sz: 2.5 },
    ],
    portals: [BACK],
    seats: [],
    huddles: [{ id: "vip", name: "VIP corner", x: -6, z: -4.4, r: 1.8 }],
  },
  {
    id: "lab",
    name: "AI Lab",
    icon: "🧠",
    tag: "Build, demo and share ideas",
    blurb: "A neural-network core, workstations you can sit at, server racks and a prompt wall for sharing what you are building.",
    color: 0x5ef2c8,
    hw: 9.2, z0: -8.2, z1: 8.0,
    orb: { x: 0, z: -1.5 },
    orbName: "Neural core",
    spawn: { x: 0, z: 5.2, yaw: PI },
    zones: [
      { id: "orb", name: "Neural core", icon: "🧠", x: 0, z: -1.5, sx: 0, sz: 0.6 },
      { id: "wall", name: "Prompt wall", icon: "💬", x: 0, z: -8.2, sx: 0, sz: -5.6 },
      { id: "desks", name: "Workstations", icon: "💻", x: 8.4, z: -1.5, sx: 6.4, sz: -1.5 },
      { id: "racks", name: "Server racks", icon: "🖥️", x: -8.4, z: -1.5, sx: -6.4, sz: -1.5 },
    ],
    portals: [BACK],
    seats: [-5.6, -2.9, -0.2, 2.5].map((z, i): Seat => ({ id: "d" + i, x: 7, z, yaw: PI / 2 })),
    huddles: [
      { id: "a", name: "Brainstorm circle", x: -4.2, z: 4.6, r: 1.9 },
      { id: "b", name: "Demo circle", x: 4.2, z: 4.6, r: 1.9 },
    ],
    board: { title: "PROMPT WALL", text: "What would you build with AI today? Post your idea from Actions.", accent: 0x5ef2c8 },
  },
  {
    id: "cosmos",
    name: "Cosmos Deck",
    icon: "🪐",
    tag: "Stargaze and meet new people",
    blurb: "An open deck above a giant planet. Sit on a bench, join a stargazing circle for a private chat, or use Connect me to find someone like you.",
    color: 0xa66bff,
    hw: 9.2, z0: -8.2, z1: 8.0,
    orb: { x: 0, z: -2.6 },
    orbName: "Gravity core",
    spawn: { x: 0, z: 5.2, yaw: PI },
    zones: [
      { id: "orb", name: "Gravity core", icon: "🌀", x: 0, z: -2.6, sx: 0, sz: -0.9 },
      { id: "bench", name: "Star benches", icon: "🪑", x: 0, z: 3.2, sx: 0, sz: 5.0 },
      { id: "rail", name: "Observation rail", icon: "🔭", x: 0, z: -8, sx: 0, sz: -6.6 },
    ],
    portals: [BACK],
    seats: [-3.6, -1.8, 1.8, 3.6].map((x, i): Seat => ({ id: "b" + i, x, z: 3.3, yaw: PI })),
    huddles: [
      { id: "a", name: "Stargazing circle", x: -6, z: -3.6, r: 1.9 },
      { id: "b", name: "Moon talk", x: 6, z: -3.6, r: 1.9 },
    ],
  },
];

export const getRoom = (id: string | null | undefined): RoomDef => ROOMS.find((r) => r.id === id) || ROOMS[0];
export const isRoomId = (v: unknown): v is RoomId => ROOMS.some((r) => r.id === v);
/** Where to appear in `to` when arriving from `from`. */
export const spawnFor = (to: RoomId, from?: RoomId): Spawn => {
  const r = getRoom(to);
  return (from && r.from?.[from]) || r.spawn;
};
