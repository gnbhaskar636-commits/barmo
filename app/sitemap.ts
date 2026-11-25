import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand.config";
import { ROOMS } from "@/lib/world/rooms";
import { GAMES } from "@/lib/games/types";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // 13 Core Platform Routes
  const staticRoutes = [
    { route: "", priority: 1.0, changeFrequency: "daily" as const },
    { route: "/world", priority: 0.9, changeFrequency: "daily" as const },
    { route: "/games", priority: 0.85, changeFrequency: "weekly" as const },
    { route: "/tournaments", priority: 0.85, changeFrequency: "weekly" as const },
    { route: "/leaderboard", priority: 0.8, changeFrequency: "weekly" as const },
    { route: "/shop", priority: 0.7, changeFrequency: "weekly" as const },
    { route: "/explore", priority: 0.7, changeFrequency: "weekly" as const },
    { route: "/dashboard", priority: 0.7, changeFrequency: "weekly" as const },
    { route: "/community", priority: 0.7, changeFrequency: "weekly" as const },
    { route: "/people", priority: 0.7, changeFrequency: "weekly" as const },
    { route: "/groups", priority: 0.7, changeFrequency: "weekly" as const },
    { route: "/profile", priority: 0.6, changeFrequency: "weekly" as const },
    { route: "/setup", priority: 0.4, changeFrequency: "weekly" as const },
  ];

  const coreSitemap: MetadataRoute.Sitemap = staticRoutes.map(({ route, priority, changeFrequency }) => ({
    url: `${BRAND.url}${route}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  // 7 3D World Sector Routes
  const worldSitemap: MetadataRoute.Sitemap = (ROOMS || []).map((r) => ({
    url: `${BRAND.url}/world/${r.id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // 5 Game Deep Links
  const gameSitemap: MetadataRoute.Sitemap = (GAMES || []).map((g) => ({
    url: `${BRAND.url}/games?g=${g.id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...coreSitemap, ...worldSitemap, ...gameSitemap];
}
