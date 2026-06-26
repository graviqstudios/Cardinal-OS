"use server";

import { revalidatePath } from "next/cache";

import { createClient, getUser } from "@/lib/supabase/server";
import { deleteToken, getToken } from "@/lib/integrations/tokens";
import { freshAccessToken, fetchGoogleEvents } from "@/lib/integrations/google";
import { notionRecentPages, notionPageText } from "@/lib/integrations/notion";
import { spotifyAccessToken, spotifyPlaylists } from "@/lib/integrations/spotify";
import { reindexJournalEntry } from "@/lib/journal/embed";
import type { ProviderId } from "@/lib/integrations/registry";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

/** Disconnect a provider: removes the stored (encrypted) tokens for this user. */
export async function disconnectProvider(provider: ProviderId): Promise<Result> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  await deleteToken(user.id, provider);
  revalidatePath("/settings/integrations");
  return { ok: true };
}

/** Create tasks from accepted draft titles (e.g. from a Gmail scan). */
export async function importTasks(titles: string[]): Promise<Result> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const rows = titles
    .map((t) => t.trim())
    .filter(Boolean)
    .map((title) => ({ user_id: user.id, title, status: "next" as const }));
  if (rows.length === 0) return { ok: true };

  const { error } = await supabase.from("tasks").insert(rows);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/plan");
  revalidatePath("/today");
  return { ok: true };
}

/** Pull the next 30 days of Google Calendar events into Cardinal (dedupe by id). */
export async function syncGoogleCalendar(): Promise<Result<{ imported: number }>> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const token = await freshAccessToken(user.id, "google_calendar");
  if (!token) return { ok: false, error: "Google Calendar not connected." };

  let events;
  try {
    events = await fetchGoogleEvents(token, 30);
  } catch {
    return { ok: false, error: "Could not read your Google Calendar." };
  }

  const rows = events
    .filter((e) => e.start && (e.start.dateTime || e.start.date))
    .map((e) => {
      const allDay = !e.start!.dateTime;
      const startISO = e.start!.dateTime ?? `${e.start!.date}T00:00:00Z`;
      const endISO = e.end?.dateTime ?? (e.end?.date ? `${e.end.date}T00:00:00Z` : startISO);
      return {
        user_id: user.id,
        external_id: e.id,
        source: "google",
        title: e.summary?.trim() || "(untitled)",
        start_time: startISO,
        end_time: endISO,
        all_day: allDay,
        type: "calendar" as const,
      };
    });

  if (rows.length > 0) {
    const { error } = await supabase
      .from("events")
      .upsert(rows, { onConflict: "user_id,external_id" });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/calendar");
  revalidatePath("/today");
  return { ok: true, data: { imported: rows.length } };
}

/* ── Notion ────────────────────────────────────────────────────────────────── */

export async function listNotionPages(): Promise<
  Result<{ pages: { id: string; title: string }[] }>
> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const token = await getToken(user.id, "notion");
  if (!token) return { ok: false, error: "Notion not connected." };
  try {
    const pages = await notionRecentPages(token.accessToken);
    return { ok: true, data: { pages } };
  } catch {
    return { ok: false, error: "Could not reach Notion." };
  }
}

/** Import one Notion page into the journal as a searchable note. */
export async function importNotionPage(pageId: string, title: string): Promise<Result> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const token = await getToken(user.id, "notion");
  if (!token) return { ok: false, error: "Notion not connected." };

  let content = "";
  try {
    content = await notionPageText(token.accessToken, pageId);
  } catch {
    return { ok: false, error: "Could not read that page." };
  }

  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: user.id,
      type: "note",
      title: title || "Notion page",
      content: content || null,
      date: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  await reindexJournalEntry(supabase, user.id, data.id as string, content);
  revalidatePath("/journal");
  return { ok: true };
}

/* ── Spotify ───────────────────────────────────────────────────────────────── */

export async function listSpotifyPlaylists(): Promise<
  Result<{ playlists: { id: string; name: string }[] }>
> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const token = await spotifyAccessToken(user.id);
  if (!token) return { ok: false, error: "Spotify not connected." };
  try {
    const playlists = await spotifyPlaylists(token);
    return { ok: true, data: { playlists } };
  } catch {
    return { ok: false, error: "Could not reach Spotify." };
  }
}

/** Save the chosen "focus playlist" on the user's profile. */
export async function setFocusPlaylist(id: string, name: string): Promise<Result> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("users")
    .update({ focus_playlist_id: id, focus_playlist_name: name })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/integrations");
  return { ok: true };
}
