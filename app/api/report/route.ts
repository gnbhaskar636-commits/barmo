import { NextResponse } from "next/server";

/**
 * Player reports. There is no database here on purpose: each report is written to the server log and, if you set
 * REPORT_WEBHOOK_URL (a Discord or Slack incoming webhook), posted to your moderation channel.
 * Reports include the reported person's last few chat lines so a moderator has context.
 */
export const runtime = "nodejs";

const REASONS = ["Harassment", "Spam", "Inappropriate content", "Impersonation", "Something else"];
const hits = new Map<string, number[]>();
const limited = (ip: string) => {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 5;
};
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n) : "");

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (limited(ip)) return NextResponse.json({ error: "Too many reports. Please wait a minute." }, { status: 429 });
  let b: { room?: unknown; target?: unknown; reason?: unknown; note?: unknown; lines?: unknown; by?: unknown } = {};
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const target = clip(b.target, 40);
  const reason = typeof b.reason === "string" && REASONS.includes(b.reason) ? b.reason : "";
  if (!target || !reason) return NextResponse.json({ error: "Choose who and why." }, { status: 400 });
  const report = {
    at: new Date().toISOString(),
    room: clip(b.room, 20),
    by: clip(b.by, 40),
    target,
    reason,
    note: clip(b.note, 300),
    lines: Array.isArray(b.lines) ? b.lines.slice(-8).map((l) => clip(l, 200)).filter(Boolean) : [],
  };
  console.warn("[BARMO REPORT]", JSON.stringify(report));
  const hook = process.env.REPORT_WEBHOOK_URL?.trim();
  if (hook && /^https:\/\//.test(hook)) {
    const text = `🚩 Report: ${report.target} (${report.reason}) in ${report.room || "a world"}, by ${report.by || "anon"}${report.note ? "\nNote: " + report.note : ""}${report.lines.length ? "\nRecent lines:\n" + report.lines.join("\n") : ""}`.slice(0, 1800);
    try {
      await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text, text }), signal: AbortSignal.timeout(6000) });
    } catch {
      /* logged above either way */
    }
  }
  return NextResponse.json({ ok: true });
}
