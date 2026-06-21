import Link from "next/link";

import { Needle } from "@/components/shell/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Needle size={40} />
      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Page not found
      </p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">
        Off the map.
      </h1>
      <p className="mt-3 max-w-sm text-muted-foreground">
        This page doesn&apos;t exist, or it moved. Let&apos;s get you back to
        your bearings.
      </p>
      <Link href="/today" className="mt-6">
        <Button>Back to Today</Button>
      </Link>
    </main>
  );
}
