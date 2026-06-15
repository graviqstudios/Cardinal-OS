export type TaskStatus = "today" | "next" | "in_progress" | "weekly" | "done";
export type Priority = "p1" | "p2" | "p3";

export type Task = {
  id: string;
  user_id: string;
  title: string;
  status: TaskStatus;
  priority: Priority | null;
  due_date: string | null;
  project_id: string | null;
  goal_id: string | null;
  recurring: boolean;
  completed_at: string | null;
  created_at: string;
};

export const TASK_BUCKETS: { id: TaskStatus; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "in_progress", label: "In progress" },
  { id: "next", label: "Next" },
  { id: "weekly", label: "This week" },
  { id: "done", label: "Done" },
];
