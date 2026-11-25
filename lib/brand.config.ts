/**
 * Central Brand & Domain Configuration for BARMO GAMING UNIVERSE
 *
 * Configurable for any custom domain via NEXT_PUBLIC_APP_URL environment variable.
 */

export const BRAND = {
  name: "BARMO",
  edition: "GAMING UNIVERSE",
  title: "BARMO — Next-Generation Gaming Universe | Play Beyond Limits",
  tagline: "PLAY BEYOND LIMITS.",
  heroHeadline: "YOUR WORLD. YOUR GAME. YOUR LEGACY.",
  description:
    "Discover new worlds, challenge players, build your squad and create your own gaming legacy inside BARMO. The premier WebGL 3D gaming universe and esports network.",
  shortDescription: "The Next-Generation 3D Gaming Universe.",

  // Production URL: uses env variable if configured, or default production domain
  url: process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://barmo.gg",

  themeColor: "#030712",
  accentColor: "#8b5cf6",
  cyanColor: "#06b6d4",
  goldColor: "#f59e0b",
  emeraldColor: "#10b981",

  socials: {
    twitter: "@BarmoGaming",
    discord: "https://discord.gg/barmo",
    github: "https://github.com/gnbhaskar636-commits/barmo",
  },

  features: [
    { id: "universe", icon: "🌌", title: "3D Gaming Worlds", desc: "Seven immersive spatial gaming environments with real-time physics and anti-gravity design." },
    { id: "multiplayer", icon: "⚔️", title: "Instant Multiplayer", desc: "Zero-latency WebRTC and Realtime battle rooms with match codes, spectator mode, and ready checks." },
    { id: "tournaments", icon: "🏆", title: "Esports & Tournaments", desc: "Compete in automated seasonal ladders, weekend cups, and skill-based bounty challenges." },
    { id: "squads", icon: "👥", title: "Social Gaming Squads", desc: "Form persistent gaming clans, voice chat in real-time, share match telemetry and coordinate raids." },
    { id: "economy", icon: "⬡", title: "Rewards & Marketplace", desc: "Earn tokens through in-game triumphs; customize avatars with exclusive cyber gear and auras." },
    { id: "ai", icon: "🤖", title: "Nova Gaming Companion", desc: "AI co-pilot analyzing your gameplay, explaining strategies, and setting up custom challenges." },
  ],
};

export function getCanonicalUrl(path: string = ""): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${BRAND.url}${cleanPath}`;
}

