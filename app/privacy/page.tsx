import type { Metadata } from "next";

import { PRIVACY } from "@/lib/legal/content";
import { LegalDocView } from "@/components/legal/legal-doc";

// The root layout's title template already appends "· Cardinal OS".
export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return <LegalDocView doc={PRIVACY} />;
}
