"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogOut, Menu, X } from "lucide-react";

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
}: {
  displayName: string;
  email: string;
}) {
  const [open, setOpen] = React.useState(false);

  // Close the mobile drawer whenever the route changes.
  const pathname = usePathname();
  React.useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      {/* ── Mobile top bar ─────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:hidden">
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
      />

      {/* ── Desktop sidebar (pinned; only the nav list scrolls) ──── */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-surface md:flex">
        <div className="flex h-14 items-center px-5">
          <Brand />
        </div>
        <NavList className="flex-1 px-3 py-2" />
        <UserFooter displayName={displayName} email={email} />
      </aside>
    </>
  );
}

function MobileDrawer({
  open,
  onClose,
  displayName,
  email,
}: {
  open: boolean;
  onClose: () => void;
  displayName: string;
  email: string;
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
            <div className="flex h-14 items-center justify-between px-5">
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
            <NavList className="flex-1 px-3 py-2" />
            <UserFooter displayName={displayName} email={email} />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}


function NavList({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav className={cn("space-y-1 overflow-y-auto", className)}>
      {NAV_ITEMS.map((item) => (
        <NavRow
          key={item.href}
          item={item}
          active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
        />
      ))}
    </nav>
  );
}

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  const iconStyle = item.colorVar
    ? { color: `hsl(var(${item.colorVar}))` }
    : undefined;

  const inner = (
    <>
      {item.mark ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.mark} alt="" className="h-4 w-4 shrink-0" />
      ) : (
        <Icon className="h-4 w-4 shrink-0" style={iconStyle} />
      )}
      <span className="flex-1">{item.label}</span>
      {!item.enabled && (
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Soon
        </span>
      )}
    </>
  );

  const base =
    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors";

  if (!item.enabled) {
    return (
      <div
        aria-disabled
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
}: {
  displayName: string;
  email: string;
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

  return (
    <div className="border-t p-3">
      <div className="flex items-center gap-3 px-2 py-1.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
          {displayName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
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
      </div>
    </div>
  );
}
