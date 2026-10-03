// Mirrors backend/schemas.py.
// To generate these automatically instead: `npm run gen:types` (backend must be running).

export type Status = "queued" | "transcribing" | "summarizing" | "done" | "failed";

export interface Segment {
  start: number;
  end: number;
  text: string;
}

export interface ActionItem {
  task: string;
  owner: string | null;
  due: string | null;
}

export interface Summary {
  title: string;
  tldr: string;
  key_points: string[];
  decisions: string[];
  action_items: ActionItem[];
  open_questions: string[];
}

export interface MeetingListItem {
  id: string;
  filename: string;
  title: string | null;
  status: Status;
  duration_seconds: number | null;
  created_at: string;
}

export interface MeetingDetail extends MeetingListItem {
  error: string | null;
  segments: Segment[] | null;
  summary: Summary | null;
}

export interface MeetingCreated {
  id: string;
  status: Status;
}
