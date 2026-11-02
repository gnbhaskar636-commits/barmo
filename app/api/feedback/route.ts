import { NextResponse } from "next/server";

/**
 * Feedback from players ("Send feedback" in the menu) and crash reports from the error screen.
 * Written to the server log and, if REPORT_WEBHOOK_URL is set (Discord or Slack), posted to your channel.
 */
export const runtime = "nodejs";

const CATS = ["Bug", "Idea", "Confusing", "Love it"];
const hits = new Map<string, number[]>();
const limited = (ip: string) => {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 6;
};
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n) : "");

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (limited(ip)) return NextResponse.json({ error: "Too many messages. Please wait a minute." }, { status: 429 });
  let b: { category?: unknown; message?: unknown; diag?: unknown } = {};
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const category = typeof b.category === "string" && CATS.includes(b.category) ? b.category : "";
  const message = clip(b.message, 600);
  if (!category || message.length < 3) return NextResponse.json({ error: "Please write a few words." }, { status: 400 });
  const entry = { at: new Date().toISOString(), category, message, diag: clip(b.diag, 300) };
  console.warn("[BARMO FEEDBACK]", JSON.stringify(entry));
  const hook = process.env.REPORT_WEBHOOK_URL?.trim();
  if (hook && /^https:\/\//.test(hook)) {
    const text = `💬 ${entry.category}: ${entry.message}${entry.diag ? "\n(" + entry.diag + ")" : ""}`.slice(0, 1800);
    try {
      await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text, text }), signal: AbortSignal.timeout(6000) });
    } catch {
      /* logged above either way */
    }
  }
  return NextResponse.json({ ok: true });
}
