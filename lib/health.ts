/** Setup check: which optional services are connected. Pure logic: it only looks at which settings exist, never at their values. */
export interface Check {
  id: string;
  label: string;
  ok: boolean;
  /** Needed for the app to work at all. */
  required: boolean;
  detail: string;
  unlocks: string;
  fix: string;
}
type Env = Record<string, string | undefined>;
const has = (v: string | undefined) => !!v && v.trim().length > 0;

export function computeHealth(env: Env): Check[] {
  const supaOk = has(env.NEXT_PUBLIC_SUPABASE_URL) && (has(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) || has(env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
  const provider = has(env.OPENROUTER_API_KEY) ? "OpenRouter" : has(env.ANTHROPIC_API_KEY) ? "Anthropic" : "";
  const lkParts = [has(env.LIVEKIT_URL), has(env.LIVEKIT_API_KEY), has(env.LIVEKIT_API_SECRET)];
  const lkOk = lkParts.every(Boolean);
  const hook = (env.REPORT_WEBHOOK_URL || "").trim();
  return [
    {
      id: "supabase", label: "Live multiplayer (Supabase)", required: true, ok: supaOk,
      detail: supaOk ? "Connected: people can see each other and chat live." : "Not set: everyone would be alone in the worlds.",
      unlocks: "Seeing other people, live chat, shared screens, trivia and everything else that is shared.",
      fix: "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (from your Supabase project, Settings, API) in Vercel, then redeploy.",
    },
    {
      id: "ai", label: "AI (Nova, AI crew, AI trivia, code review)", required: false, ok: !!provider,
      detail: provider ? `Connected through ${provider}${has(env.NOVA_MODEL) ? ` (model ${env.NOVA_MODEL})` : ""}.` : "No key: Nova and the crew still answer from built-in notes.",
      unlocks: "Real AI answers from Nova and the characters, AI trivia questions, AI meeting notes, translation, reply suggestions, code review.",
      fix: "Add OPENROUTER_API_KEY (or ANTHROPIC_API_KEY) in Vercel, then redeploy.",
    },
    {
      id: "livekit", label: "Video meetings and private-circle voice (LiveKit)", required: false, ok: lkOk,
      detail: lkOk ? "Connected." : lkParts.some(Boolean) ? "Partly set: all three LiveKit values are needed." : "Not set: video meetings are switched off.",
      unlocks: "Camera and screen share in the Meeting Hall, and voice in private circles.",
      fix: "Add LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET (free at cloud.livekit.io) in Vercel, then redeploy.",
    },
    {
      id: "reports", label: "Player reports and feedback delivery", required: false, ok: /^https:\/\//.test(hook),
      detail: /^https:\/\//.test(hook) ? "Reports and feedback are sent to your webhook." : "No webhook: reports and feedback are only written to the Vercel logs.",
      unlocks: "Reports and feedback land in your Discord or Slack channel.",
      fix: "Create an incoming webhook in Discord or Slack and set REPORT_WEBHOOK_URL in Vercel, then redeploy.",
    },
  ];
}
export const isReady = (checks: Check[]) => checks.filter((c) => c.required).every((c) => c.ok);
