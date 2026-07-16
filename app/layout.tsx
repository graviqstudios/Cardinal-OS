import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";

import "@/Design/tokens.css";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeScript } from "@/components/theme/theme-script";
import { NativeBootstrap } from "@/components/native/native-bootstrap";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";
import { createClient, getUser } from "@/lib/supabase/server";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";
import {
  isAccent,
  isPalette,
  type Accent,
  type Palette,
} from "@/lib/theme/config";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · Cardinal OS",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // Note: Google has ignored the keywords meta tag since 2009 — kept only for
  // the minor engines that still read it, and aligned to the student framing.
  keywords: [
    "Cardinal OS",
    "student planner",
    "student planner app",
    "all in one student app",
    "study planner",
    "study tracker",
    "habit tracker for students",
    "goal tracker",
    "task manager for students",
    "student budget tracker",
    "AI study planner",
    "Life Score",
  ],
  authors: [{ name: "GraviQ Studios", url: SITE_URL }],
  creator: "GraviQ Studios",
  publisher: "GraviQ Studios",
  category: "productivity",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: "@GraviQStudios",
    creator: "@GraviQStudios",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/brand/favicon.svg",
    apple: "/brand/apple-touch-icon.png",
  },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // expose safe-area insets for the native edge-to-edge shell
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
    const user = await getUser();
    const supabase = await createClient();
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
    // Supabase not configured yet - fall back to client defaults.
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
          <NativeBootstrap />
          <ServiceWorkerRegistrar />
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
