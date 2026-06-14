export type Pod = {
  id: string;
  name: string;
  exam_target: string | null;
  invite_code: string;
  created_by: string;
  created_at: string;
};

export type PodStat = {
  user_id: string;
  name: string | null;
  readiness: number;
  streak: number;
  current_goal: string | null;
  updated_at: string;
};

export type PodMemberView = {
  user_id: string;
  joined_at: string;
  stat: PodStat | null;
  isYou: boolean;
};

export type PodSummary = Pod & { memberCount: number };

export type PodDetail = Pod & { members: PodMemberView[] };
