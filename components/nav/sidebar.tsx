"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogOut, Menu, PanelLeft, PanelLeftClose, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { NAV_ITEMS, type NavItem } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Tap } from "@/components/motion/tap";
import { Brand } from "@/components/shell/brand";
import { DURATION, EASE_OUT } from "@/lib/motion/variants";

export function Sidebar({
  displayName,
  email,
  examMode,
}: {
  displayName: string;
  email: string;
  examMode: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  // Close the mobile drawer whenever the route changes.
  const pathname = usePathname();
  React.useEffect(() => setOpen(false), [pathname]);

  // Restore the desktop collapsed preference (set after mount to avoid an SSR
  // hydration mismatch).
  React.useEffect(() => {
    if (localStorage.getItem("sidebar-collapsed") === "1") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  return (
    <>
      {/* ── Mobile top bar ─────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center gap-3 border-b bg-background/80 px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
        <Tap className="inline-flex">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </Tap>
        <Brand />
      </header>

      {/* ── Mobile drawer ──────────────────────────────────────── */}
      <MobileDrawer
        open={open}
        onClose={() => setOpen(false)}
        displayName={displayName}
        email={email}
        examMode={examMode}
      />

      {/* ── Desktop sidebar (pinned; only the nav list scrolls) ──── */}
      <aside
        data-tour="sidebar"
        className={cn(
          // Solid surface (not translucent): the sidebar is a full-height column
          // that never overlaps content, so glassmorphism only muddied contrast
          // on the light parchment/sage themes - especially in the installed PWA.
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-surface transition-[width] duration-200 md:flex",
          collapsed ? "w-[68px]" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center",
            collapsed ? "justify-center px-2" : "justify-between px-5",
          )}
        >
          {collapsed ? (
            <Tap className="inline-flex">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Expand sidebar"
                onClick={toggleCollapsed}
              >
                <PanelLeft className="h-5 w-5" />
              </Button>
            </Tap>
          ) : (
            <>
              <Brand />
              <Tap className="inline-flex">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Collapse sidebar"
                  onClick={toggleCollapsed}
                >
                  <PanelLeftClose className="h-5 w-5" />
                </Button>
              </Tap>
            </>
          )}
        </div>
        <NavList className="flex-1 px-3 py-2" examMode={examMode} collapsed={collapsed} />
        <UserFooter displayName={displayName} email={email} collapsed={collapsed} />
      </aside>
    </>
  );
}

function MobileDrawer({
  open,
  onClose,
  displayName,
  email,
  examMode,
}: {
  open: boolean;
  onClose: () => void;
  displayName: string;
  email: string;
  examMode: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.base, ease: EASE_OUT }}
            onClick={onClose}
          />
          <motion.aside
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r bg-surface"
            initial={reduceMotion ? { opacity: 0 } : { x: "-100%" }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: "-100%" }}
            transition={{ duration: DURATION.slow, ease: EASE_OUT }}
          >
            <div className="flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between px-5 pt-[env(safe-area-inset-top)]">
              <Brand />
              <Tap className="inline-flex">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close navigation"
                  onClick={onClose}
                >
                  <X className="h-5 w-5" />
                </Button>
              </Tap>
            </div>
            <NavList className="flex-1 px-3 py-2" examMode={examMode} />
            <UserFooter displayName={displayName} email={email} />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}


function NavList({
  className,
  examMode,
  collapsed = false,
}: {
  className?: string;
  examMode: boolean;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const items = examMode
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => !item.examOnly);
  return (
    <nav className={cn("space-y-1.5 overflow-y-auto", className)}>
      {items.map((item) => (
        <NavRow
          key={item.href}
          item={item}
          active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
          collapsed={collapsed}
        />
      ))}
    </nav>
  );
}

function NavRow({
  item,
  active,
  collapsed = false,
}: {
  item: NavItem;
  active: boolean;
  collapsed?: boolean;
}) {
  const Icon = item.icon;
  const iconStyle = item.colorVar
    ? { color: `hsl(var(${item.colorVar}))` }
    : undefined;

  const inner = (
    <>
      {item.mark ? (
        // Module marks carry ~20% internal clear space, so scale them up to read
        // at the same visual weight as the full-bleed lucide icons beside them.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.mark} alt="" className="h-5 w-5 shrink-0 scale-[1.45]" />
      ) : (
        <Icon className="h-5 w-5 shrink-0" style={iconStyle} />
      )}
      {!collapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {!item.enabled && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Soon
            </span>
          )}
        </>
      )}
    </>
  );

  const base = cn(
    "flex items-center rounded-md text-[15px] font-medium transition-colors",
    collapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5",
  );

  if (!item.enabled) {
    return (
      <div
        aria-disabled
        title={collapsed ? item.label : undefined}
        className={cn(base, "cursor-not-allowed text-muted-foreground/70")}
      >
        {inner}
      </div>
    );
  }

  return (
    <Tap className="block">
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        title={collapsed ? item.label : undefined}
        className={cn(
          base,
          active
            ? "bg-primary/10 text-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        {inner}
      </Link>
    </Tap>
  );
}

function UserFooter({
  displayName,
  email,
  collapsed = false,
}: {
  displayName: string;
  email: string;
  collapsed?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function signOut() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const avatar = (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary"
      title={collapsed ? displayName : undefined}
    >
      {displayName.charAt(0).toUpperCase()}
    </span>
  );

  const signOutButton = (
    <Tap className="inline-flex">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Sign out"
        onClick={signOut}
        disabled={pending}
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </Tap>
  );

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 border-t p-3">
        {avatar}
        {signOutButton}
      </div>
    );
  }

  return (
    <div className="border-t p-3">
      <div className="flex items-center gap-3 px-2 py-1.5">
        {avatar}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        {signOutButton}
      </div>
    </div>
  );
}
