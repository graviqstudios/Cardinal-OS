import type { NextConfig } from "next";

/**
 * Cardinal OS — every route runs on the Node.js runtime.
 * Never add `export const runtime = "edge"` anywhere: the Supabase SSR auth,
 * AI, and RAG routes assume full Node.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
