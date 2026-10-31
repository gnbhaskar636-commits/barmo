/** Achievements: small goals that pop up as you explore. Saved on this device. Pure logic, no three.js. */
export interface Achievement { id: string; icon: string; title: string; desc: string }

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_chat", icon: "💬", title: "Ice breaker", desc: "Send your first chat message" },
  { id: "first_drink", icon: "☕", title: "Regular", desc: "Order a drink from a bartender" },
  { id: "dj", icon: "🎧", title: "DJ", desc: "Play a song for the room" },
  { id: "cinema", icon: "🎬", title: "Movie night", desc: "Put a video on the big screen" },
  { id: "meeting", icon: "🎥", title: "Face to face", desc: "Join a video meeting" },
  { id: "class", icon: "🎓", title: "Student", desc: "Start an AI class" },
  { id: "coder", icon: "💻", title: "First commit", desc: "Solve a code lab challenge" },
  { id: "coder3", icon: "🧠", title: "Hacker", desc: "Solve 3 code lab challenges" },
  { id: "wish", icon: "🌠", title: "Wish upon a star", desc: "Make a wish on a comet" },
  { id: "quiz", icon: "🧠", title: "Quiz night", desc: "Answer a trivia question" },
  { id: "quiz_win", icon: "🏆", title: "Quiz champ", desc: "Win a trivia night against other players" },
  { id: "photo", icon: "📸", title: "Photographer", desc: "Take a photo of a world" },
  { id: "explorer", icon: "🧭", title: "Explorer", desc: "Visit all five worlds" },
];
export const ACH_REWARD = 10; // tokens

const KEY = "barmo-achievements";
const VISIT = "barmo-visited";
const read = (k: string): string[] => {
  try {
    const a = JSON.parse(localStorage.getItem(k) || "[]") as unknown;
    return Array.isArray(a) ? a.filter((x): x is string => typeof x === "string").slice(0, 50) : [];
  } catch {
    return [];
  }
};
const write = (k: string, v: string[]) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* ignore */
  }
};

export const loadAchievements = () => read(KEY).filter((id) => ACHIEVEMENTS.some((a) => a.id === id));

/** Unlocks one. Returns the achievement only the first time, so the caller can celebrate. */
export function unlock(id: string): Achievement | null {
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a) return null;
  const have = read(KEY);
  if (have.includes(id)) return null;
  write(KEY, [...have, id]);
  return a;
}

/** Records a visit to a world. Returns the Explorer achievement when the fifth world is visited. */
export function visitWorld(room: string, total = 5): Achievement | null {
  const v = read(VISIT);
  if (!v.includes(room)) {
    v.push(room);
    write(VISIT, v);
  }
  return v.length >= total ? unlock("explorer") : null;
}
