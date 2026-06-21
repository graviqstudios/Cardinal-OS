import type { Metadata } from "next";

import { PRIVACY } from "@/lib/legal/content";
import { LegalDocView } from "@/components/legal/legal-doc";

export const metadata: Metadata = { title: "Privacy Policy · Cardinal OS" };

export default function PrivacyPage() {
  return <LegalDocView doc={PRIVACY} />;
}
