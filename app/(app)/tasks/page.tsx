import { redirect } from "next/navigation";

// Folded into the Plan hub. Keep the old path working for bookmarks and the tour.
export default function TasksPage() {
  redirect("/plan?tab=tasks");
}
