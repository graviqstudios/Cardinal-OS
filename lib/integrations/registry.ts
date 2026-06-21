/** Provider catalogue for the integration layer. Client-safe metadata only. */

export type ProviderId =
  | "google_calendar"
  | "google_gmail"
  | "notion"
  | "spotify"
  | "evernote";

export type ProviderMeta = {
  id: ProviderId;
  name: string;
  blurb: string;
  /** Logo served from /site-assets (reused from the landing page). */
  logo: string;
};

// NOTE: Gmail and Evernote connections are intentionally hidden for now (their
// backend code remains dormant under lib/integrations + app/api/integrations).
// Re-add their entries here to bring the cards back.
export const PROVIDERS: ProviderMeta[] = [
  {
    id: "google_calendar",
    name: "Google Calendar",
    blurb: "Two-way sync between Cardinal events and your Google Calendar.",
    logo: "/site-assets/logo-gcal.png",
  },
  {
    id: "notion",
    name: "Notion",
    blurb: "Import a page as a note, or a database row as a task.",
    logo: "/site-assets/logo-notion.png",
  },
  {
    id: "spotify",
    name: "Spotify",
    blurb: "Link a focus playlist that cues when you start a session.",
    logo: "/site-assets/logo-spotify.png",
  },
];
