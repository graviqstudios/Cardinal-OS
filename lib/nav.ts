import {
  Dumbbell,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  type LucideIcon,
  Mic,
  Settings,
  Target,
  Users,
  Wallet,
  Grid3x3,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** CSS var name for the module's fixed colour, if it has one. */
  colorVar?: string;
  /** Brand module mark (from Design/assets, served at /brand), if it has one. */
  mark?: string;
  enabled: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, enabled: true },
  { label: "Study", href: "/study", icon: GraduationCap, colorVar: "--module-study", mark: "/brand/module-study.svg", enabled: true },
  { label: "Practice", href: "/practice", icon: Dumbbell, colorVar: "--module-study", enabled: true },
  { label: "Heatmap", href: "/heatmap", icon: Grid3x3, colorVar: "--module-readiness", mark: "/brand/module-readiness.svg", enabled: true },
  { label: "Calendar", href: "/calendar", icon: CalendarDays, colorVar: "--module-calendar", mark: "/brand/module-calendar.svg", enabled: true },
  { label: "Goals", href: "/goals", icon: Target, colorVar: "--module-goals", mark: "/brand/module-goals.svg", enabled: true },
  { label: "Money", href: "/money", icon: Wallet, colorVar: "--module-money", mark: "/brand/module-money.svg", enabled: true },
  { label: "Pods", href: "/pods", icon: Users, enabled: true },
  { label: "Voice", href: "/voice", icon: Mic, enabled: true },
  { label: "Settings", href: "/settings", icon: Settings, enabled: true },
];
