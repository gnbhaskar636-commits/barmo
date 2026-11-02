/** Chat text helpers: links, @mentions, slash commands, message grouping and times. Pure logic so it can be tested. */
export type Token = { t: "text"; s: string } | { t: "link"; s: string; href: string };

const URL_RE = /https?:\/\/[^\s<>"']+/gi;
const TRAIL = /[.,!?;:)\]}]+$/;

/** Splits a message into plain text and safe http(s) links. */
export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const idx = m.index ?? 0;
    let raw = m[0];
    const trail = raw.match(TRAIL);
    if (trail) raw = raw.slice(0, raw.length - trail[0].length);
    let ok = false;
    try {
      const u = new URL(raw);
      ok = (u.protocol === "https:" || u.protocol === "http:") && !u.username && !u.password;
    } catch {
      ok = false;
    }
    if (!ok) continue;
    if (idx > last) out.push({ t: "text", s: text.slice(last, idx) });
    out.push({ t: "link", s: raw.length > 42 ? raw.slice(0, 40) + "…" : raw, href: raw });
    last = idx + raw.length;
  }
  if (last < text.length) out.push({ t: "text", s: text.slice(last) });
  return out.length ? out : [{ t: "text", s: text }];
}
export function firstLink(text: string): string | null {
  const l = tokenize(text).find((t): t is Extract<Token, { t: "link" }> => t.t === "link");
  return l ? l.href : null;
}

/** If the input ends with "@som", returns "som" (the part to autocomplete). */
export function mentionQuery(input: string): string | null {
  const m = input.match(/(?:^|\s)@([\p{L}\p{N}_-]{0,20})$/u);
  return m ? m[1] : null;
}
/** If the input is a slash command still being typed ("/no"), returns "/no". */
export function slashQuery(input: string): string | null {
  return /^\/[a-z]{0,8}$/i.test(input) ? input.toLowerCase() : null;
}
export const SLASH = [
  { cmd: "/nova ", hint: "Ask Nova, answers in the room" },
  { cmd: "/me ", hint: "Do an action" },
  { cmd: "/roll", hint: "Roll a dice" },
];
export const suggestSlash = (q: string) => SLASH.filter((s) => s.cmd.startsWith(q));

export function suggestNames(q: string, names: string[], max = 5): string[] {
  const k = q.toLowerCase();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const name = n.trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const first = name.split(/\s+/)[0].toLowerCase();
    if (!k || name.toLowerCase().startsWith(k) || first.startsWith(k)) out.push(name);
    if (out.length >= max) break;
  }
  return out;
}
/** Replaces the trailing "@som" with "@FirstName ". Mentions match on the first name. */
export function applyMention(input: string, name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return input.replace(/@([\p{L}\p{N}_-]{0,20})$/u, "@" + first + " ");
}

/** Whether a message should show its name and time (first of a run from the same person). */
export function showHead(msgs: { who: string; at: number; sys?: boolean; reply?: unknown }[], i: number, gapMs = 3 * 60_000): boolean {
  const m = msgs[i];
  const p = msgs[i - 1];
  if (!p) return true;
  return p.sys === true || m.sys === true || p.who !== m.who || m.at - p.at > gapMs || !!m.reply;
}

export function fmtTime(ms: number): string {
  try {
    return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
