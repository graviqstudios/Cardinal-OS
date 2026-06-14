import type { Metadata, Viewport } from "next";

import "@/Design/tokens.css";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeScript } from "@/components/theme/theme-script";
import { createClient } from "@/lib/supabase/server";
import {
  isAccent,
  isPalette,
  type Accent,
  type Palette,
} from "@/lib/theme/config";

export const metadata: Metadata = {
  title: "Cardinal OS",
  description:
    "Your AI tutor, planner, and progress tracker in one place — so you always know what to study next.",
  icons: { icon: "/brand/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5EFE3" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0907" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Hydrate the chosen palette/accent from the user's profile when signed in.
  let initialPalette: Palette | undefined;
  let initialAccent: Accent | undefined;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("users")
        .select("theme, accent_color")
        .eq("id", user.id)
        .single();
      if (data) {
        if (isPalette(data.theme)) initialPalette = data.theme;
        if (isAccent(data.accent_color)) initialAccent = data.accent_color;
      }
    }
  } catch {
    // Supabase not configured yet — fall back to client defaults.
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
        <ThemeScript palette={initialPalette} accent={initialAccent} />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <ThemeProvider initialPalette={initialPalette} initialAccent={initialAccent}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
