# Cardinal OS - Phase 0

The foundation: Next.js 15 (App Router, TS) · Tailwind **v3** · shadcn/ui (new-york) ·
Framer Motion · Supabase (`@supabase/ssr`) · next-themes · Geist. Every route runs on
the **Node.js runtime** - never add `export const runtime = "edge"`.

## What's in Phase 0

- **Auth** - email + Google OAuth via Supabase SSR (middleware-refreshed sessions).
- **Token theme system** - three independent layers, all CSS custom properties:
  - base mode (dark default) via `next-themes` class on `<html>`
  - palette (Midnight / Slate / Paper / Sand / OLED) via `data-theme`
  - accent (Indigo / Rose / Amber / Emerald / Sky) via `data-accent`, driving
    `--primary` + `--ring` so it threads through every button, ring, and active nav item
  - instant switch with a ≤200ms cross-fade, disabled under `prefers-reduced-motion`,
    persisted per user (profile + localStorage, no-flash pre-paint script)
- **Motion foundation** - disciplined Framer Motion (≤250ms easeOut): page-transition
  wrapper (fade + rise), tap press-scale, reduced-motion fallbacks.
- **Sidebar shell** - all modules with their fixed colours (mobile drawer + desktop rail).
- **Onboarding** - 3 screens: accent + theme → exam/goal → target date.
- **Dashboard** - greets by name, shows today's context (date, exam countdown, trial).
- **Settings** - live theme/accent controls + profile editing.
- **DB** - `supabase/migrations/0001_users.sql`: `users` table, RLS, signup trigger.

## Local setup

```bash
npm install
cp .env.local.example .env.local   # then fill in the two Supabase values
npm run dev
```

> A `.env.local` with **placeholder** Supabase values is committed-locally so the app
> compiles before you have a project. Replace the two `NEXT_PUBLIC_SUPABASE_*` values
> with your real ones - auth will not work until you do.

## ⚠️ Two steps you do in the Supabase dashboard

These are intentionally left to you (do them in this order):

1. **Create the Supabase project.** Then copy Project Settings → API →
   `Project URL` and `anon public` key into `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Run the migration in
   `supabase/migrations/0001_users.sql` (SQL Editor, or `supabase db push`).
2. **Enable the Google OAuth provider.** Authentication → Providers → Google. Set the
   redirect URL to:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
   and add your site URL(s) under Authentication → URL Configuration → Redirect URLs:
   `http://localhost:3000/auth/callback` (and your production URL later).
```
