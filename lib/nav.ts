import {
  CalendarDays,
  Dumbbell,
  FolderKanban,
  GraduationCap,
  Grid3x3,
  Home,
  ListChecks,
  type LucideIcon,
  Mic,
  Repeat,
  Settings,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** CSS var name for the module's fixed colour, if it has one. */
  colorVar?: string;
  /** Brand module mark (from Design/assets, served at /brand), if it has one. */
  mark?: string;
  /** Part of the opt-in Exam Prep template — hidden unless the user enables it. */
  examOnly?: boolean;
  enabled: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Today", href: "/today", icon: Home, enabled: true },
  { label: "Habits", href: "/habits", icon: Repeat, colorVar: "--module-habits", enabled: true },
  { label: "Tasks", href: "/tasks", icon: ListChecks, colorVar: "--module-tasks", enabled: true },
  { label: "Projects", href: "/projects", icon: FolderKanban, colorVar: "--module-projects", enabled: true },
  { label: "Goals", href: "/goals", icon: Target, colorVar: "--module-goals", mark: "/brand/module-goals.svg", enabled: true },
  { label: "Calendar", href: "/calendar", icon: CalendarDays, colorVar: "--module-calendar", mark: "/brand/module-calendar.svg", enabled: true },
  { label: "Money", href: "/money", icon: Wallet, colorVar: "--module-money", mark: "/brand/module-money.svg", enabled: true },
  { label: "Study", href: "/study", icon: GraduationCap, colorVar: "--module-study", mark: "/brand/module-study.svg", examOnly: true, enabled: true },
  { label: "Heatmap", href: "/heatmap", icon: Grid3x3, colorVar: "--module-readiness", mark: "/brand/module-readiness.svg", examOnly: true, enabled: true },
  { label: "Practice", href: "/practice", icon: Dumbbell, colorVar: "--module-study", examOnly: true, enabled: true },
  { label: "Voice", href: "/voice", icon: Mic, examOnly: true, enabled: true },
  { label: "Constellations", href: "/constellations", icon: Sparkles, enabled: true },
  { label: "Settings", href: "/settings", icon: Settings, enabled: true },
];
