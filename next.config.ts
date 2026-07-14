import type { NextConfig } from "next";

/**
 * Cardinal OS - every route runs on the Node.js runtime.
 * Never add `export const runtime = "edge"` anywhere: the Supabase SSR auth,
 * AI, and RAG routes assume full Node.
 */

// Baseline security headers (OWASP A05: secure defaults). Kept conservative so
// nothing breaks: no Content-Security-Policy yet (the app uses an inline theme
// bootstrap script plus Supabase/Google/AI origins, so a CSP needs nonce wiring
// and per-route testing - tracked as a follow-up). HSTS is intentionally without
// includeSubDomains/preload to avoid affecting sibling graviq.in subdomains.
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera/mic/screen-share are enabled for our own origin (LiveKit voice
  // rooms render first-party). Geolocation/topics stay off.
  {
    key: "Permissions-Policy",
    value:
      "camera=(self), microphone=(self), display-capture=(self), geolocation=(), browsing-topics=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
