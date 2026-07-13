import { redirect } from "next/navigation";

/** Legacy route - Pods is now "Constellations". Preserve old links/bookmarks. */
export default async function PodsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ pod?: string }>;
}) {
  const sp = await searchParams;
  redirect(sp.pod ? `/constellations?c=${sp.pod}` : "/constellations");
}
