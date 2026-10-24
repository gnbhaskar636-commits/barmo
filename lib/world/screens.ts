/** Shared screens: the Party Hall cinema (video links) and the AI Lab class (lesson slides). Pure logic, no three.js. */

export interface VideoSrc { kind: "embed" | "file"; src: string; label: string; host: string }

const ID11 = /^[\w-]{11}$/;
/**
 * Turns a pasted link into something safe to play, or null.
 * Only https links to YouTube, Vimeo, or a direct .mp4/.webm/.ogv file are accepted.
 * `startSec` lets late joiners start roughly where everyone else is.
 */
export function parseVideoUrl(raw: unknown, startSec = 0): VideoSrc | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!text || text.length > 400) return null;
  let u: URL;
  try {
    u = new URL(text);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.username || u.password) return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const t = Math.max(0, Math.min(21600, Math.floor(startSec) || 0));
  let yt = "";
  if (host === "youtu.be") yt = u.pathname.split("/")[1] || "";
  else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/);
    yt = m ? m[1] : u.searchParams.get("v") || "";
  }
  if (yt) {
    if (!ID11.test(yt)) return null;
    return { kind: "embed", src: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&playsinline=1&start=${t}`, label: "YouTube video", host: "youtube.com" };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = u.pathname.match(/\/(?:video\/)?(\d{5,12})(?:\/|$)/);
    if (!m) return null;
    return { kind: "embed", src: `https://player.vimeo.com/video/${m[1]}?autoplay=1#t=${t}s`, label: "Vimeo video", host: "vimeo.com" };
  }
  if (/\.(mp4|webm|ogv)$/i.test(u.pathname)) {
    return { kind: "file", src: u.href.split("#")[0] + `#t=${t}`, label: decodeURIComponent(u.pathname.split("/").pop() || "Video").slice(0, 40), host };
  }
  return null;
}

export interface Slide { h: string; pts: string[] }
export interface Lesson { id: string; title: string; icon: string; slides: Slide[] }

export const LESSONS: Lesson[] = [
  {
    id: "what", title: "What is AI?", icon: "🧠",
    slides: [
      { h: "AI in one sentence", pts: ["Software that learns patterns from examples instead of following hand-written rules.", "You show it many examples; it finds what they have in common."] },
      { h: "Rules vs learning", pts: ["Rules: if the email contains 'free money' then spam.", "Learning: show 100,000 spam and normal emails and let the model find the pattern.", "Learning handles cases nobody wrote a rule for."] },
      { h: "Where you meet it", pts: ["Photo search, spam filters, maps, voice assistants, translation, chatbots.", "Most of it is prediction: what is the most likely answer?"] },
      { h: "What AI is not", pts: ["Not magic and not human thinking.", "It can be confidently wrong, so check important answers.", "It reflects the data it learned from, including its mistakes."] },
    ],
  },
  {
    id: "nn", title: "How neural networks learn", icon: "🔗",
    slides: [
      { h: "Neurons and layers", pts: ["A neuron takes numbers in, multiplies each by a weight, adds them up and passes the result on.", "Layers of neurons stacked together form a neural network."] },
      { h: "Learning = adjusting weights", pts: ["Start with random weights. Make a prediction. Measure how wrong it is (the loss).", "Nudge every weight a little to reduce the loss. Repeat millions of times."] },
      { h: "Gradient descent", pts: ["Imagine walking downhill in fog: feel the slope and step down.", "Backpropagation works out the slope for every weight efficiently."] },
      { h: "Overfitting", pts: ["A model that memorises its examples fails on new ones.", "Fix it with more data, simpler models, and testing on examples it never trained on."] },
    ],
  },
  {
    id: "llm", title: "How chatbots (LLMs) work", icon: "💬",
    slides: [
      { h: "Predict the next word", pts: ["A large language model is trained to predict the next piece of text.", "Do that billions of times on huge amounts of text and it learns grammar, facts and style."] },
      { h: "Tokens", pts: ["Text is split into tokens: small chunks like 'learn' and 'ing'.", "Models read and write tokens, and usage is usually priced per token."] },
      { h: "Context window", pts: ["The model only sees what is in its context: your messages and the instructions.", "It does not remember earlier chats unless you include them."] },
      { h: "Why it makes things up", pts: ["It produces likely-sounding text, not verified truth.", "Give it sources, ask for steps, and verify facts that matter."] },
    ],
  },
  {
    id: "prompt", title: "Prompting well", icon: "✍️",
    slides: [
      { h: "Be specific", pts: ["Say who it is for, what you want, and how long or in what format.", "Vague in, vague out."] },
      { h: "Show an example", pts: ["One good example of the output you want beats a paragraph of explanation.", "This is called few-shot prompting."] },
      { h: "Give it steps and a role", pts: ["Ask it to think through the problem step by step before answering.", "Give a role: 'You are a careful code reviewer'."] },
      { h: "Iterate", pts: ["Treat the first answer as a draft.", "Say what to change: shorter, more formal, add a table."] },
    ],
  },
  {
    id: "build", title: "Build your first AI app", icon: "🛠️",
    slides: [
      { h: "The simplest AI app", pts: ["A web page with a text box, a server route, and a call to an AI model's API.", "Your server holds the secret key; the browser never sees it."] },
      { h: "The request", pts: ["Send the model a system instruction plus the user's message.", "Receive text back and show it on the page."] },
      { h: "Make it useful", pts: ["Give it your own data (search or a database) so answers are specific.", "Add limits, error messages and a fallback for when the API fails."] },
      { h: "Ship it safely", pts: ["Rate-limit your route, validate input, never put keys in the browser.", "Start tiny, test with real users, improve weekly."] },
    ],
  },
];

const STOP = new Set("the a an and or of to is are what how why does do in on for it its this that with can i you me my be as at by from".split(" "));
/** Answers from the lesson notes when no AI key is set up. Always returns something helpful. */
export function answerLocal(q: string): string {
  const words = q.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));
  let best: { score: number; l: Lesson; s: Slide } | null = null;
  LESSONS.forEach((l) =>
    l.slides.forEach((s) => {
      const hay = (l.title + " " + s.h + " " + s.pts.join(" ")).toLowerCase();
      const score = words.reduce((a, w) => a + (hay.includes(w) ? 1 : 0), 0);
      if (score > 0 && (!best || score > best.score)) best = { score, l, s };
    })
  );
  const b = best as { score: number; l: Lesson; s: Slide } | null;
  if (!b) return "Good question. I only have the class notes right now, so try asking about neural networks, tokens, prompts, or how to build an AI app.";
  return `From "${b.l.title}" (${b.s.h}): ${b.s.pts.join(" ")}`;
}
