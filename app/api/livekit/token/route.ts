import { NextResponse } from "next/server";
import { AccessToken, TrackSource } from "livekit-server-sdk";
import { getRoom, isRoomId } from "@/lib/world/rooms";

/**
 * Hands the browser a short-lived LiveKit ticket for ONE private circle's voice room.
 * Needs LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET (server-side only).
 * Without them it answers 501 and the app falls back to direct browser-to-browser voice.
 */
export const runtime = "nodejs";

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 20;
}
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function POST(req: Request) {
  const url = process.env.LIVEKIT_URL?.trim();
  const key = process.env.LIVEKIT_API_KEY?.trim();
  const secret = process.env.LIVEKIT_API_SECRET?.trim();
  if (!url || !key || !secret) return NextResponse.json({ error: "livekit_not_configured" }, { status: 501 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (limited(ip)) return NextResponse.json({ error: "Too many tries. Wait a minute." }, { status: 429 });

  let b: { room?: unknown; h?: unknown; id?: unknown; name?: unknown } = {};
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  // Only real circles in real worlds get a voice room.
  const roomId = clip(b.room, 20);
  const h = clip(b.h, 24);
  if (!isRoomId(roomId) || !getRoom(roomId).huddles.some((x) => x.id === h)) {
    return NextResponse.json({ error: "Unknown circle" }, { status: 400 });
  }
  const identity = clip(b.id, 96);
  if (identity.length < 8) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const name = clip(b.name, 20) || "Guest";

  const at = new AccessToken(key, secret, { identity, name, ttl: "1h" });
  at.addGrant({
    roomJoin: true,
    room: `barmo:${roomId}:${h}`,
    canPublish: true,
    canSubscribe: true,
    canPublishData: false,
    canPublishSources: [TrackSource.MICROPHONE],
  });
  return NextResponse.json({ token: await at.toJwt(), url });
}
