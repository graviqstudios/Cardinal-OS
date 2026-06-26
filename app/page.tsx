import { redirect } from "next/navigation";

import { createClient, getUser } from "@/lib/supabase/server";
import { LandingPage } from "@/components/landing/landing-page";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

// Structured data so search engines understand the product and publisher. Helps
// surface Cardinal for "life OS / productivity app / Notion alternative" queries.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "GraviQ Studios",
      url: SITE_URL,
      logo: `${SITE_URL}/brand/logo-needle.svg`,
      sameAs: [
        "https://x.com/GraviQStudios",
        "https://www.linkedin.com/company/graviqstudios",
        "https://github.com/graviqstudios/Cardinal-OS",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web",
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    },
  ],
};

/**
 * Root entry. Signed-in users go straight to their command centre; everyone
 * else sees the public marketing landing page (served at the clean "/" URL).
 */
export default async function Home() {
  let signedIn = false;
  try {
    const user = await getUser();
    signedIn = Boolean(user);
  } catch {
    // Supabase not configured yet — treat as signed out and show the landing.
  }

  // redirect() throws internally, so it must run outside the try/catch above.
  if (signedIn) redirect("/today");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  );
}
