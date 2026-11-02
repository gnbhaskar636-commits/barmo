import { computeHealth, isReady } from "@/lib/health";
import { check, section } from "./_t";

export async function run() {
  section("setup check");
  const none = computeHealth({});
  check(!isReady(none), "nothing set: not ready");
  check(none.find((c) => c.id === "supabase")?.required === true, "Supabase is required");
  const base = { NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "k" };
  check(isReady(computeHealth(base)), "Supabase set: ready");
  check(isReady(computeHealth({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "k" })), "legacy anon key also counts");
  check(computeHealth({ ...base, OPENROUTER_API_KEY: "k" }).find((c) => c.id === "ai")?.detail.includes("OpenRouter") === true, "OpenRouter detected");
  check(computeHealth({ ...base, ANTHROPIC_API_KEY: "k" }).find((c) => c.id === "ai")?.ok === true, "Anthropic detected");
  check(computeHealth({ ...base, LIVEKIT_URL: "wss://a" }).find((c) => c.id === "livekit")?.ok === false, "LiveKit needs all three values");
  check(computeHealth({ ...base, LIVEKIT_URL: "wss://a", LIVEKIT_API_KEY: "b", LIVEKIT_API_SECRET: "c" }).find((c) => c.id === "livekit")?.ok === true, "LiveKit complete");
  check(computeHealth({ ...base, REPORT_WEBHOOK_URL: "http://insecure" }).find((c) => c.id === "reports")?.ok === false, "webhook must be https");
  const text = JSON.stringify(computeHealth({ ...base, OPENROUTER_API_KEY: "SECRET123", LIVEKIT_API_SECRET: "SECRET456" }));
  check(!text.includes("SECRET123") && !text.includes("SECRET456"), "no secret values appear in the output");
}
