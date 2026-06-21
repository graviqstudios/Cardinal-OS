export type Skill = {
  id: string;
  user_id: string;
  name: string;
  level: number;
  xp: number;
  area_tag: string | null;
  created_at: string;
};

/** Flat curve: every 100 XP is a level. Simple and legible. */
export const XP_PER_LEVEL = 100;

export function levelForXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

/** XP earned into the current level (0..XP_PER_LEVEL). */
export function xpIntoLevel(xp: number): number {
  return ((xp % XP_PER_LEVEL) + XP_PER_LEVEL) % XP_PER_LEVEL;
}
