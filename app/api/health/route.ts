import { NextResponse } from "next/server";
import { computeHealth, isReady } from "@/lib/health";
import { probePlatformHealth } from "@/lib/admin/telemetry";
import { APP_VERSION } from "@/lib/version";

/** Setup check data for /setup and /admin. Only reports whether each setting exists, never the values. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const checks = computeHealth(process.env as Record<string, string | undefined>);
  const telemetry = await probePlatformHealth();
  return NextResponse.json(
    { version: APP_VERSION, ready: isReady(checks), checks, telemetry },
    { headers: { "Cache-Control": "no-store" } }
  );
}
