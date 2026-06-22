import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

/**
 * Lets search engines index the public marketing + auth pages, and keeps the
 * private (authenticated) app sections and API out of the index. Points crawlers
 * at the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/today",
        "/plan",
        "/health",
        "/journal",
        "/calendar",
        "/money",
        "/constellations",
        "/pods",
        "/settings",
        "/onboarding",
        "/dashboard",
        "/study",
        "/practice",
        "/voice",
        "/heatmap",
        "/habits",
        "/tasks",
        "/projects",
        "/goals",
        "/body",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
