import type { Accent, Palette } from "@/lib/theme/config";

/** Mirrors the public.users table (see supabase/migrations/0001_users.sql). */
export type Profile = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  exam_target: string | null;
  exam_date: string | null; // ISO date (yyyy-mm-dd)
  accent_color: Accent | null;
  theme: Palette | null;
  sex: "female" | "male" | "other" | null;
  exam_mode: boolean;
  tour_completed_at: string | null;
  tour_version: number;
  terms_accepted_at: string | null;
  trial_started_at: string;
  is_pro: boolean;
  subscription_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

/** True once the user has completed onboarding (picked a palette + accent). */
export function isOnboarded(profile: Pick<Profile, "accent_color" | "theme">) {
  return Boolean(profile.accent_color && profile.theme);
}
