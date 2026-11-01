/** Trivia night: questions, timing, scoring. Pure logic (no three.js) so it can be tested and shared by server and browser. */
export interface QuizQ { q: string; o: string[]; a: number }
export interface QuizState { qs: QuizQ[]; t0: number; by: string; cat: string }
export type Answers = Record<string, Record<number, { c: number; at: number }>>;

export const Q_TIME = 15_000; // time to answer
export const REVEAL = 5_000; // time to show the answer
export const SLOT = Q_TIME + REVEAL;
export const LEAD = 4_000; // countdown before question 1

export const CATS: Record<string, string> = { mix: "Mixed", ai: "AI and tech", space: "Space", world: "World", fun: "Music and fun" };

// [question, correct answer, three wrong answers]
type Item = [string, string, string, string, string];
const BANK: Record<string, Item[]> = {
  ai: [
    ["What does GPU stand for?", "Graphics Processing Unit", "General Purpose Unit", "Game Power Utility", "Grid Processing Utility"],
    ["Which language runs in every web browser?", "JavaScript", "Python", "C++", "Ruby"],
    ["What does AI stand for?", "Artificial Intelligence", "Automated Internet", "Applied Interface", "Advanced Input"],
    ["In a neural network, the numbers adjusted during training are called?", "Weights", "Pixels", "Tokens", "Ports"],
    ["What does HTML describe on a web page?", "Structure and content", "Only the colours", "Database queries", "Server speed"],
    ["Who created the Linux kernel?", "Linus Torvalds", "Bill Gates", "Steve Jobs", "Tim Berners-Lee"],
    ["How many bits are in one byte?", "8", "4", "16", "10"],
    ["What does URL stand for?", "Uniform Resource Locator", "Universal Ranking List", "Unique Router Link", "User Request Line"],
  ],
  space: [
    ["Which planet is known as the Red Planet?", "Mars", "Venus", "Jupiter", "Mercury"],
    ["What is the closest star to Earth?", "The Sun", "Proxima Centauri", "Sirius", "Polaris"],
    ["How many planets are in our solar system?", "8", "7", "9", "10"],
    ["What force keeps planets in orbit around the Sun?", "Gravity", "Magnetism", "Friction", "Wind"],
    ["Which planet is famous for its rings?", "Saturn", "Mars", "Earth", "Mercury"],
    ["A comet's glowing tail is mostly made of?", "Gas and dust", "Burning metal", "Liquid water", "Light beams"],
    ["Who was the first human in space?", "Yuri Gagarin", "Neil Armstrong", "Buzz Aldrin", "John Glenn"],
    ["What is the largest planet in our solar system?", "Jupiter", "Saturn", "Neptune", "Earth"],
  ],
  world: [
    ["What is the capital of India?", "New Delhi", "Mumbai", "Kolkata", "Chennai"],
    ["Which is the largest ocean?", "Pacific", "Atlantic", "Indian", "Arctic"],
    ["Which continent is Egypt in?", "Africa", "Asia", "Europe", "South America"],
    ["Which country is the city of Tokyo in?", "Japan", "China", "Thailand", "South Korea"],
    ["How many continents are there?", "7", "5", "6", "8"],
    ["Mount Everest sits on the border of Nepal and which country?", "China", "India", "Bhutan", "Pakistan"],
    ["What is the capital of France?", "Paris", "Lyon", "Nice", "Marseille"],
    ["Which is the largest hot desert in the world?", "Sahara", "Gobi", "Thar", "Kalahari"],
  ],
  fun: [
    ["How many strings does a standard guitar have?", "6", "4", "5", "8"],
    ["Which instrument has black and white keys?", "Piano", "Violin", "Flute", "Drums"],
    ["How many players are on the pitch for one football (soccer) team?", "11", "9", "10", "12"],
    ["How many sides does a hexagon have?", "6", "5", "7", "8"],
    ["Mixing blue and yellow paint gives which colour?", "Green", "Purple", "Orange", "Brown"],
    ["How many players take the field for one cricket team?", "11", "9", "10", "12"],
    ["Which of these is a percussion instrument?", "Drums", "Violin", "Trumpet", "Flute"],
    ["How many minutes are in an hour?", "60", "100", "30", "90"],
  ],
};

function shuffle<T>(a: T[], rand: () => number): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** Picks `n` questions from the built-in bank and shuffles the answer order. */
export function pickQuestions(cat: string, n = 5, rand: () => number = Math.random): QuizQ[] {
  const pool = cat in BANK ? BANK[cat] : Object.values(BANK).flat();
  return shuffle(pool, rand).slice(0, n).map(([q, right, ...wrong]) => {
    const o = shuffle([right, ...wrong], rand);
    return { q, o, a: o.indexOf(right) };
  });
}

/** Strictly checks questions that came from the network or from the AI. Returns cleaned questions or null. */
export function validateQs(raw: unknown): QuizQ[] | null {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 10) return null;
  const out: QuizQ[] = [];
  for (const it of raw) {
    const x = it as { q?: unknown; o?: unknown; a?: unknown };
    if (typeof x?.q !== "string" || x.q.trim().length < 3 || x.q.length > 140) return null;
    if (!Array.isArray(x.o) || x.o.length !== 4 || x.o.some((s) => typeof s !== "string" || !s.trim() || s.length > 60)) return null;
    const opts = (x.o as string[]).map((s) => s.replace(/[<>]/g, "").trim());
    if (new Set(opts.map((s) => s.toLowerCase())).size !== 4) return null;
    if (typeof x.a !== "number" || !Number.isInteger(x.a) || x.a < 0 || x.a > 3) return null;
    out.push({ q: x.q.replace(/[<>]/g, "").trim(), o: opts, a: x.a });
  }
  return out;
}

/** Pulls a JSON array of questions out of an AI reply (it may wrap it in text or code fences). */
export function parseQuizJson(text: string): QuizQ[] | null {
  const a = text.indexOf("[");
  const b = text.lastIndexOf("]");
  if (a < 0 || b <= a) return null;
  try {
    return validateQs(JSON.parse(text.slice(a, b + 1)));
  } catch {
    return null;
  }
}

export type Phase = "lobby" | "question" | "reveal" | "done";
export function phaseAt(st: QuizState, now: number): { phase: Phase; i: number; msLeft: number; into: number } {
  const rel = now - st.t0;
  if (rel < 0) return { phase: "lobby", i: 0, msLeft: -rel, into: 0 };
  const i = Math.floor(rel / SLOT);
  if (i >= st.qs.length) return { phase: "done", i: st.qs.length - 1, msLeft: 0, into: 0 };
  const into = rel - i * SLOT;
  return into < Q_TIME ? { phase: "question", i, msLeft: Q_TIME - into, into } : { phase: "reveal", i, msLeft: SLOT - into, into };
}

/** 100 points for a right answer, plus up to 50 for speed. */
export const points = (into: number) => 100 + Math.round(50 * Math.max(0, 1 - into / Q_TIME));

export interface Score { id: string; name: string; pts: number; right: number }
export function scores(st: QuizState, ans: Answers, names: Record<string, string>): Score[] {
  return Object.keys(ans)
    .map((id) => {
      let pts = 0;
      let right = 0;
      st.qs.forEach((q, i) => {
        const a = ans[id]?.[i];
        if (a && a.c === q.a && a.at >= 0 && a.at <= Q_TIME) {
          pts += points(a.at);
          right++;
        }
      });
      return { id, name: names[id] || "Player", pts, right };
    })
    .sort((x, y) => y.pts - x.pts || y.right - x.right);
}
