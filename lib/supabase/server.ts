import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Server Supabase client for Server Components, Route Handlers, and Server
 * Actions. In Next.js 15 `cookies()` is async. Writing cookies from a Server
 * Component throws — that's expected and safely ignored, because the middleware
 * refreshes the session cookie on every request.
 *
 * Wrapped in React `cache()` so a single render pass reuses one client instead
 * of recreating it in every server component / query helper.
 */
export const createClient = cache(async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore (middleware refreshes).
          }
        },
      },
    },
  );
});

/**
 * The authenticated user for the current request, deduplicated across the whole
 * render pass. Previously each layout/page/query helper called
 * `supabase.auth.getUser()` independently, costing one Auth round-trip apiece;
 * `cache()` collapses them into a single call per request.
 */
export const getUser = cache(async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
