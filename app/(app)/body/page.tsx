import { redirect } from "next/navigation";

// Body was renamed to Health. Keep the old path working for bookmarks.
export default function BodyPage() {
  redirect("/health");
}
