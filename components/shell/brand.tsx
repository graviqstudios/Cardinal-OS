import Link from "next/link";

import { cn } from "@/lib/utils";

/** The Needle - two-facet compass mark (BRAND §2). Cardinal north, bone south. */
export function Needle({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="34 0 32 100"
      height={size}
      width={Math.round(size * 0.34)}
      className={className}
      aria-hidden="true"
    >
      <path d="M50 6 L61 53 L39 53 Z" style={{ fill: "var(--mod-readiness)" }} />
      <path d="M50 86 L61 53 L39 53 Z" style={{ fill: "var(--brand-bone)" }} />
    </svg>
  );
}

/** Primary lockup: the Needle + serif "Cardinal" + small tracked sans "OS". */
export function Brand({
  href = "/today",
  className,
  compact = false,
}: {
  href?: string;
  className?: string;
  /** Mark-only lockup (no wordmark) - used by the collapsed sidebar. */
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label="Cardinal OS"
      className={cn("flex items-center gap-3", compact && "justify-center", className)}
    >
      <Needle size={30} />
      {!compact && (
        <span className="flex items-baseline gap-1">
          <span className="font-serif text-2xl leading-none tracking-tight">Cardinal</span>
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            OS
          </span>
        </span>
      )}
    </Link>
  );
}
