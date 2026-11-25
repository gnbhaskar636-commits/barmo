import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand.config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/"],
    },
    sitemap: `${BRAND.url}/sitemap.xml`,
    host: BRAND.url,
  };
}
