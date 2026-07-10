import Link from "next/link";

import { Needle } from "@/components/shell/brand";
import { LEGAL, type LegalDoc } from "@/lib/legal/content";

/** Readable renderer for a legal document (Privacy / Terms). */
export function LegalDocView({ doc }: { doc: LegalDoc }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16 sm:py-20">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <Needle size={18} /> <span className="font-serif text-lg">Cardinal</span>
      </Link>

      <h1 className="mt-8 font-serif text-4xl tracking-tight sm:text-5xl">{doc.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated {LEGAL.updated}.
      </p>

      <div className="mt-10 space-y-8">
        {doc.sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-base font-semibold">{s.h}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="mt-2 text-sm leading-relaxed text-muted-foreground">{p}</p>
            ))}
          </section>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap gap-5 border-t pt-6 text-sm">
        <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
        <Link href="/terms" className="text-primary hover:underline">Terms &amp; Conditions</Link>
        <a href={`mailto:${LEGAL.email}`} className="text-muted-foreground hover:text-foreground">Contact</a>
      </div>
    </main>
  );
}
