import { redirect } from "next/navigation";

/**
 * The voice examiner is no longer a top-level tab — it now lives inside each
 * subject in the single Study hub. Keep the route as a redirect so old
 * bookmarks/PWA shortcuts don't 404.
 */
export default function VoiceRedirect() {
  redirect("/study");
}
