import type { Metadata } from "next";

import { TERMS } from "@/lib/legal/content";
import { LegalDocView } from "@/components/legal/legal-doc";

// The root layout's title template already appends "· Cardinal OS".
export const metadata: Metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return <LegalDocView doc={TERMS} />;
}
