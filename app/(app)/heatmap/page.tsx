import { redirect } from "next/navigation";

/**
 * The whole-syllabus heat map now lives on the Study dashboard, and each subject
 * has its own heat map. Keep the route as a redirect so old bookmarks/PWA
 * shortcuts don't 404.
 */
export default function HeatmapRedirect() {
  redirect("/study");
}
