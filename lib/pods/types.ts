export type Pod = {
  id: string;
  name: string;
  exam_target: string | null;
  invite_code: string;
  created_by: string;
  created_at: string;
};

export type Visibility = "public" | "private";

/** A pod with its Discord-style server fields (0034_servers_channels.sql). */
export type Server = Pod & {
  description: string | null;
  visibility: Visibility;
  icon_url: string | null;
  member_cap: number;
};

export type ChannelType = "text" | "voice";

export type ChannelCategory = {
  id: string;
  pod_id: string;
  name: string;
  position: number;
  created_at: string;
};

export type Channel = {
  id: string;
  pod_id: string;
  category_id: string | null;
  name: string;
  type: ChannelType;
  position: number;
  created_at: string;
};

export type PodStat = {
  user_id: string;
  name: string | null;
  readiness: number;
  streak: number;
  study_minutes: number;
  current_goal: string | null;
  updated_at: string;
};

export type PodMemberView = {
  user_id: string;
  joined_at: string;
  stat: PodStat | null;
  isYou: boolean;
};

export type PodSummary = Server & { memberCount: number };

export type PodDetail = Pod & { members: PodMemberView[] };

/** Full server view: details + categories + channels + members. */
export type ServerDetail = Server & {
  categories: ChannelCategory[];
  channels: Channel[];
  members: PodMemberView[];
  isOwner: boolean;
};

export type PodTimer = {
  pod_id: string;
  ends_at: string | null;
  label: string | null;
  phase: "focus" | "break";
  started_by: string | null;
  updated_at: string;
};
