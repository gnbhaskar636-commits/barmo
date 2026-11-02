import { NextResponse } from "next/server";
import { computeHealth, isReady } from "@/lib/health";
import { APP_VERSION } from "@/lib/version";

/** Setup check data for /setup. Only reports whether each setting exists, never the values. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  const checks = computeHealth(process.env as Record<string, string | undefined>);
  return NextResponse.json({ version: APP_VERSION, ready: isReady(checks), checks }, { headers: { "Cache-Control": "no-store" } });
}
