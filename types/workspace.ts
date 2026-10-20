/**
 * 扩展记录类型：区分观察、预约和草稿的数据结构；保存的数据应包含追溯所需的原始输入与上下文。
 */
export interface Observation {
  id: string;
  profileId: string;
  tool: string;
  date: string;
  gaDays: number | null;
  fetus: string;
  raw: Record<string, string>;
  unit: "cm" | "mm";
  normalized: Record<string, number>;
  status: string;
  formulaId: string;
  values: { label: string; value: number; unit: string }[];
  referenceIds: string[];
  createdAt: string;
  revision: number;
  supersedesId?: string;
}
export interface Appointment {
  id: string;
  profileId: string;
  name: string;
  date: string;
  time: string;
  location: string;
  note: string;
  status: "planned" | "booked" | "completed" | "skipped";
  reminder: "not_enabled";
  revision: number;
}
export interface FeedbackDraft {
  id: string;
  category: string;
  body: string;
  createdAt: string;
  status: "local_draft";
}
export interface WorkspaceState {
  version: 1;
  observations: Observation[];
  appointments: Appointment[];
  feedback: FeedbackDraft[];
  favorites: string[];
  drafts: Record<string, Record<string, string>>;
}
