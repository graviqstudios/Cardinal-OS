/**
 * Canonical site identity used for SEO (metadata, sitemap, robots, structured
 * data). The production URL can be overridden with NEXT_PUBLIC_SITE_URL; it
 * defaults to the live domain so crawlers always see absolute, correct URLs.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://cardinalos.graviq.in"
).replace(/\/$/, "");

export const SITE_NAME = "Cardinal OS";

/**
 * Backup names for the `WebSite` structured data. Google chooses the site name
 * shown in search results automatically, preferring `name` then `alternateName`
 * (developers.google.com/search/docs/appearance/site-names). Without a strong
 * subdomain-level signal it falls back to the parent domain — which is why the
 * SERP showed "graviq.in" instead of Cardinal OS.
 */
export const SITE_ALTERNATE_NAMES = ["CardinalOS", "Cardinal"];

export const SITE_TAGLINE = "One compass for everything.";

/**
 * Kept under ~155 characters so Google can show it whole: the previous copy ran
 * to ~280 and was truncated mid-sentence in search results. Meta descriptions
 * are not a ranking signal — this exists to win the click.
 */
export const SITE_DESCRIPTION =
  "One calm app for students: study, habits, goals, tasks, money and health together, with AI planning and one honest Life Score to show how you're really doing.";

/** Home-page <title>. Lead with real queries ("student planner"), brand first. */
export const SITE_TITLE =
  "Cardinal OS: All-in-One Student Planner & Life Tracker";
