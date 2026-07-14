"use client";

import Link from "next/link";
import { Compass, Home, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PodSummary } from "@/lib/pods/types";

/** Discord-style vertical rail of the user's servers + home/discover/create. */
export function ServerRail({
  servers,
  activeId,
}: {
  servers: PodSummary[];
  activeId: string | null;
}) {
  return (
    <div className="flex w-[68px] shrink-0 flex-col items-center gap-2 overflow-y-auto border-r bg-muted/30 py-3">
      <RailButton href="/constellations" active={activeId === null} label="Home">
        <Home className="h-5 w-5" />
      </RailButton>
      <RailButton href="/constellations/discover" active={false} label="Discover">
        <Compass className="h-5 w-5" />
      </RailButton>
      <div className="my-1 h-px w-8 bg-border" />

      {servers.map((s) => (
        <RailServer key={s.id} server={s} active={activeId === s.id} />
      ))}

      <RailButton href="/constellations" active={false} label="Add a server">
        <Plus className="h-5 w-5" />
      </RailButton>
    </div>
  );
}

function RailButton({
  href,
  active,
  label,
  children,
}: {
  href: string;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-[22px] border bg-background text-muted-foreground transition-all hover:rounded-2xl hover:text-foreground",
        active && "rounded-2xl border-primary text-primary",
      )}
    >
      {children}
    </Link>
  );
}

function RailServer({
  server,
  active,
}: {
  server: PodSummary;
  active: boolean;
}) {
  const initial = server.name.charAt(0).toUpperCase();
  return (
    <Link
      href={`/constellations/${server.id}`}
      title={server.name}
      className={cn(
        "flex h-11 w-11 items-center justify-center overflow-hidden rounded-[22px] bg-primary/10 text-sm font-semibold text-primary transition-all hover:rounded-2xl",
        active && "rounded-2xl ring-2 ring-primary",
      )}
    >
      {server.icon_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={server.icon_url} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </Link>
  );
}
