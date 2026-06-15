import { redirect } from "next/navigation";

/** The home is now /today (Life OS command centre). Keep this for old links. */
export default function DashboardPage() {
  redirect("/today");
}
