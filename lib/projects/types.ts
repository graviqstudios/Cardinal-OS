export type ProjectStatus = "active" | "upcoming" | "later";

export type Project = {
  id: string;
  user_id: string;
  name: string;
  status: ProjectStatus;
  progress: number;
  color: string | null;
  created_at: string;
};

export type ProjectWithCounts = Project & { openTasks: number; totalTasks: number };

export const PROJECT_STATUSES: { id: ProjectStatus; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "upcoming", label: "Upcoming" },
  { id: "later", label: "Later" },
];
