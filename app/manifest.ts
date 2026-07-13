import type { MetadataRoute } from "next";

import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

/**
 * Web App Manifest - makes Cardinal OS installable as a PWA (Add to Home Screen
 * / "Install app"). Served at /manifest.webmanifest, which the middleware already
 * treats as a public file. The brand colours mirror the parchment theme so the
 * splash and task-switcher chrome match the app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Cardinal",
    description: SITE_DESCRIPTION,
    id: "/",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5EFE3",
    theme_color: "#CB4B33",
    categories: ["productivity", "lifestyle", "education"],
    icons: [
      {
        src: "/brand/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
