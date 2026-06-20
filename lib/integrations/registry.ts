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

export const PROVIDERS: ProviderMeta[] = [
  {
    id: "google_calendar",
    name: "Google Calendar",
    blurb: "Two-way sync between Cardinal events and your Google Calendar.",
    logo: "/site-assets/logo-gcal.png",
  },
  {
    id: "google_gmail",
    name: "Gmail",
    blurb: "Scan your inbox on demand and turn action items into draft tasks.",
    logo: "/site-assets/logo-gmail.png",
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
  {
    id: "evernote",
    name: "Evernote",
    blurb: "Import notebooks and notes into your second brain.",
    logo: "/site-assets/logo-evernote.png",
  },
];
