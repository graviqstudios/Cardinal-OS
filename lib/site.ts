/**
 * Canonical site identity used for SEO (metadata, sitemap, robots, structured
 * data). The production URL can be overridden with NEXT_PUBLIC_SITE_URL; it
 * defaults to the live domain so crawlers always see absolute, correct URLs.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://cardinalos.graviq.in"
).replace(/\/$/, "");

export const SITE_NAME = "Cardinal OS";

export const SITE_TAGLINE = "One compass for everything.";

export const SITE_DESCRIPTION =
  "Cardinal OS is a calm life operating system for ages 16 to 26: habits, tasks, projects, goals, journal, calendar, money and health in one place, with AI woven through and one honest Life Score to orient by. A premium alternative to Notion templates and scattered productivity apps.";
