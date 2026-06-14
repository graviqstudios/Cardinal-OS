import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Brand page header (BRAND §4 Heading + §6 module mark): a serif title with the
 * section's module mark on a tinted chip, in the module's fixed colour. Gives
 * every section a distinct identity instead of one generic icon.
 */
export function PageHeader({
  title,
  description,
  colorVar = "--primary",
  mark,
  icon,
  actions,
}: {
  title: string;
  description?: string;
  colorVar?: string;
  /** Brand module mark path (served from /brand), if the section maps to one. */
  mark?: string;
  /** Fallback glyph (lucide) for sections with no module mark. */
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex items-center gap-4">
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card border"
        style={{
          backgroundColor: `hsl(var(${colorVar}) / 0.12)`,
          borderColor: `hsl(var(${colorVar}) / 0.24)`,
          color: `hsl(var(${colorVar}))`,
        }}
      >
        {mark ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mark} alt="" className="h-6 w-6" />
        ) : (
          icon
        )}
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="font-serif text-[28px] leading-none tracking-tight sm:text-[34px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}

/** Module chip (BRAND §6/§9): mark + label on a 12% tint, 24% border. */
export function ModuleChip({
  label,
  colorVar,
  mark,
  icon,
  className,
}: {
  label: string;
  colorVar: string;
  mark?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-button border px-2.5 py-1 text-xs font-medium",
        className,
      )}
      style={{
        backgroundColor: `hsl(var(${colorVar}) / 0.12)`,
        borderColor: `hsl(var(${colorVar}) / 0.24)`,
        color: `hsl(var(${colorVar}))`,
      }}
    >
      {mark ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mark} alt="" className="h-3.5 w-3.5" />
      ) : (
        icon
      )}
      {label}
    </span>
  );
}
