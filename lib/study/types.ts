export type TopicStatus = "untouched" | "weak" | "moderate" | "strong";

export const TOPIC_STATUSES: TopicStatus[] = [
  "untouched",
  "weak",
  "moderate",
  "strong",
];

/** Module colour token (Study = Indigo) tinting + status meta for the heat scale. */
export const STATUS_META: Record<
  TopicStatus,
  { label: string; varName: string }
> = {
  untouched: { label: "Untouched", varName: "--status-untouched" },
  weak: { label: "Weak", varName: "--status-weak" },
  moderate: { label: "Moderate", varName: "--status-moderate" },
  strong: { label: "Strong", varName: "--status-strong" },
};

export type Subject = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type Topic = {
  id: string;
  user_id: string;
  subject_id: string;
  name: string;
  status: TopicStatus;
  created_at: string;
  updated_at: string;
};

export type SubjectWithTopics = Subject & { topics: Topic[] };

export type DocumentRow = {
  id: string;
  user_id: string;
  subject_id: string | null;
  file_name: string;
  file_url: string | null;
  status: "processing" | "ready" | "error";
  created_at: string;
};

export type ChatSession = {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
};

export type ChatMessageRow = {
  id: string;
  user_id: string;
  chat_session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};
