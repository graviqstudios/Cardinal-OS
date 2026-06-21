import type { Metadata } from "next";

import { TERMS } from "@/lib/legal/content";
import { LegalDocView } from "@/components/legal/legal-doc";

export const metadata: Metadata = { title: "Terms & Conditions · Cardinal OS" };

export default function TermsPage() {
  return <LegalDocView doc={TERMS} />;
}
