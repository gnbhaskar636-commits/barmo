import type { Pub } from "@/lib/social/store";

export type GameId = "dice" | "quiz" | "race" | "memory" | "cybercode";
export const GAMES: {
  id: GameId;
  name: string;
  icon: string;
  blurb: string;
  rounds: number;
  category: "Competitive" | "Arcade" | "Skill" | "Casual";
  playerCount: string;
  rating: number;
  bannerGradient: string;
}[] = [
  {
    id: "dice",
    name: "Cyber Dice Duel",
    icon: "🎲",
    blurb: "High-stakes quantum dice. Roll higher than rivals, trigger multipliers, and dominate.",
    rounds: 3,
    category: "Competitive",
    playerCount: "1 - 8 Players",
    rating: 4.9,
    bannerGradient: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.2))",
  },
  {
    id: "quiz",
    name: "Neural Quiz Arena",
    icon: "🧠",
    blurb: "Synchronized speed-trivia across science, gaming lore, mathematics, and tech history.",
    rounds: 5,
    category: "Arcade",
    playerCount: "1 - 16 Players",
    rating: 4.8,
    bannerGradient: "linear-gradient(135deg, rgba(6,182,212,0.3), rgba(16,185,129,0.2))",
  },
  {
    id: "race",
    name: "Quantum Warp Grand Prix",
    icon: "🏎️",
    blurb: "Ultra-ultimate supersonic reflex race. Enter quantum slipstream, trigger sub-150ms nitro warp, and surge ahead of rivals.",
    rounds: 3,
    category: "Skill",
    playerCount: "1 - 12 Players",
    rating: 5.0,
    bannerGradient: "linear-gradient(135deg, rgba(245,158,11,0.35), rgba(244,63,94,0.3))",
  },
  {
    id: "memory",
    name: "Matrix Memory Lock",
    icon: "🧩",
    blurb: "Memorize the sequence of glowing cyber glyphs and replicate under escalating time pressure.",
    rounds: 4,
    category: "Casual",
    playerCount: "1 - 6 Players",
    rating: 4.7,
    bannerGradient: "linear-gradient(135deg, rgba(16,185,129,0.3), rgba(6,182,212,0.2))",
  },
  {
    id: "cybercode",
    name: "Code Lab Speedrun",
    icon: "💻",
    blurb: "Solve competitive algorithmic code puzzles faster than other engineers in the room.",
    rounds: 3,
    category: "Competitive",
    playerCount: "1 - 4 Players",
    rating: 5.0,
    bannerGradient: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(244,63,94,0.2))",
  },
];

export interface GPlayer {
  id: string;
  name: string;
  av: string;
  acc?: Pub["acc"];
  top?: number;
  score: number;
  ready?: boolean;
  role?: "player" | "spectator";
  team?: "neon" | "cyber" | "sol";
}

export interface GState {
  game: GameId;
  phase: "lobby" | "play" | "reveal" | "over";
  round: number;
  rounds: number;
  host: string;
  players: Record<string, GPlayer>;
  // Phase 7 Multiplayer Lobbies & Matchmaking
  teamsEnabled?: boolean;
  readyCount?: number;
  spectatorCount?: number;
  tournamentContext?: { tournamentId: string; matchId: string; round: number };
  // Cyber Dice
  rolls?: Record<string, number>;
  multipliers?: Record<string, number>;
  // Neural Quiz
  q?: { text: string; opts: string[]; dur: number };
  answers?: Record<string, number>;
  correct?: number;
  gained?: Record<string, number>;
  // Quantum Warp Race
  rs?: "wait" | "go";
  taps?: string[];
  early?: string[];
  times?: Record<string, number>;
  speeds?: Record<string, string>;
  nitro?: Record<string, boolean>;
  slips?: Record<string, string>;
  // Matrix Memory Lock
  memorySeq?: number[];
  memoryInput?: Record<string, number[]>;
  memoryRound?: number;
  memoryPhase?: "watch" | "input";
  memoryFailures?: string[];
  memoryTimes?: Record<string, number>;
  // Code Lab Speedrun
  codeChallengeId?: string;
  codeTitle?: string;
  codeBrief?: string;
  codeStarter?: string;
  codeSubmissions?: Record<string, string | number>;
  codeResults?: Record<string, { pass: boolean; timeMs?: number; error?: string }>;
  codeTimes?: Record<string, number>;
  // Summary
  winners?: string[];
  msg: string;
}

export function isValidRoomCode(code: string): boolean {
  return /^[A-Z0-9]{4,8}$/.test(code);
}

export function getRoomShareLink(code: string, spectate = false, origin?: string): string {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/games?${spectate ? "spectate" : "join"}=${code}`;
}

export type Act =
  | { t: "join"; pub: Pub; role?: "player" | "spectator"; team?: "neon" | "cyber" | "sol" }
  | { t: "ready"; ready?: boolean }
  | { t: "team"; team: "neon" | "cyber" | "sol" }
  | { t: "role"; role: "player" | "spectator" }
  | { t: "roll" }
  | { t: "ans"; i: number }
  | { t: "tap" }
  | { t: "seq_tap"; index: number }
  | { t: "code_submit"; code?: string; pass?: boolean; ms?: number; optionIndex?: number };

export interface EngineContext {
  later: (fn: () => void, ms: number) => void;
  finishRound: () => void;
  push: () => void;
  dispatchAct: (from: string, a: Act) => void;
}

export interface RoundEvaluation {
  scores: Record<string, number>;
  msg?: string;
  winnerId?: string;
  winners?: string[];
  telemetry?: any;
}

export interface GameEngine {
  id: GameId;
  name?: string;
  initRound(round: number, currentPlayers: Record<string, GPlayer> | GPlayer[], secret?: any): Partial<GState>;
  handleAct(action: Act, playerId: string, state: GState, secret?: any): Partial<GState> | null;
  evaluateRound(state: GState, secret?: any): RoundEvaluation;
  simulateBotTurn(bot: GPlayer, state: GState, dispatchAct: (act: Act) => void, secret?: any): void;
  onRoundStart?(state: GState, secret: any, ctx: EngineContext): void;
  isRoundComplete?(state: GState): boolean;
}

export interface GameStageProps {
  state: GState;
  myId: string;
  isHost: boolean;
  onAction: (act: Act) => void;
  sound?: { play: (sfx: string) => void };
  view?: GState;
  me?: Pub;
}

export const QUESTIONS: { q: string; o: string[]; a: number }[] = [
  { q: "Which planet is known as the Red Planet?", o: ["Venus", "Mars", "Jupiter", "Mercury"], a: 1 },
  { q: "What does HTML stand for?", o: ["HyperText Markup Language", "High Tech Modern Language", "Hyperlink Text Mode Logic", "Home Tool Markup Language"], a: 0 },
  { q: "How many sides does a hexagon have?", o: ["5", "6", "7", "8"], a: 1 },
  { q: "Which ocean is the largest?", o: ["Atlantic", "Indian", "Arctic", "Pacific"], a: 3 },
  { q: "What is 12 × 12?", o: ["122", "124", "144", "148"], a: 2 },
  { q: "Which language runs in every web browser?", o: ["Python", "JavaScript", "Java", "C#"], a: 1 },
  { q: "What is the chemical symbol for water?", o: ["O2", "CO2", "H2O", "HO"], a: 2 },
  { q: "Which is the tallest mountain above sea level?", o: ["K2", "Everest", "Kilimanjaro", "Denali"], a: 1 },
  { q: "Who painted the Mona Lisa?", o: ["Van Gogh", "Picasso", "Da Vinci", "Monet"], a: 2 },
  { q: "How many continents are there?", o: ["5", "6", "7", "8"], a: 2 },
  { q: "What does CPU stand for?", o: ["Central Processing Unit", "Computer Personal Unit", "Core Power Utility", "Control Program Unit"], a: 0 },
  { q: "Which gas do plants absorb from the air?", o: ["Oxygen", "Nitrogen", "Carbon dioxide", "Helium"], a: 2 },
  { q: "What is the capital of Japan?", o: ["Osaka", "Kyoto", "Tokyo", "Nagoya"], a: 2 },
  { q: "Which planet has the most visible rings?", o: ["Saturn", "Mars", "Earth", "Neptune"], a: 0 },
];
