import type { Pub } from "@/lib/social/store";

export type GameId = "dice" | "quiz" | "race";
export const GAMES: { id: GameId; name: string; icon: string; blurb: string; rounds: number }[] = [
  { id: "dice", name: "Dice Duel", icon: "🎲", blurb: "Everyone rolls. Highest roll wins the round.", rounds: 3 },
  { id: "quiz", name: "Quick Quiz", icon: "🧠", blurb: "Fast, correct answers score the most.", rounds: 5 },
  { id: "race", name: "Reaction Race", icon: "🏁", blurb: "Tap the moment it turns green. Too early is a false start.", rounds: 3 },
];

export interface GPlayer { id: string; name: string; av: string; acc?: Pub["acc"]; top?: number; score: number }

export interface GState {
  game: GameId;
  phase: "lobby" | "play" | "reveal" | "over";
  round: number;
  rounds: number;
  host: string;
  players: Record<string, GPlayer>;
  rolls?: Record<string, number>;
  q?: { text: string; opts: string[]; dur: number };
  answers?: Record<string, number>;
  correct?: number;
  gained?: Record<string, number>;
  rs?: "wait" | "go";
  taps?: string[];
  early?: string[];
  times?: Record<string, number>;
  winners?: string[];
  msg: string;
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
