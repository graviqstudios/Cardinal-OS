export type GoalType = "personal" | "exam";

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  type: GoalType;
  target_date: string | null;
  progress: number; // 0..100
  created_at: string;
  updated_at: string;
};

export type Milestone = {
  id: string;
  user_id: string;
  goal_id: string;
  title: string;
  completed: boolean;
  due_date: string | null;
  created_at: string;
};

export type GoalWithMilestones = Goal & { milestones: Milestone[] };

export type CareerTarget = {
  id: string;
  user_id: string;
  title: string;
  required_score: string | null;
  current_score: string | null;
  notes: string | null;
  created_at: string;
};
