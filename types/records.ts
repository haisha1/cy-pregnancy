/**
 * 档案与生长记录类型：描述存储对象、历史快照和保存结果，页面与 store 共用，防止字段理解不一致。
 */
import type {
  GrowthMetric as MedicalMetric,
  PregnancyBasis,
  ReferenceStandard,
} from "./medical";
export type GrowthMetric = Exclude<MedicalMetric, "EFW">;
export type { ReferenceStandard } from "./medical";
export interface SavedBasis extends Partial<
  Omit<PregnancyBasis, "method" | "lmpEquivalent">
> {
  id: string;
  method: string;
  lmpEquivalent: string;
  revisionId?: string;
  createdAt: string;
}
export interface MeasurementSession {
  fetus?: "singleton" | "A" | "B";
  rawInputs?: Record<string, { value: string; unit: string }>;
  reportedEfwGrams?: number | null;
  basisRevisionId?: string;
  revision?: number;
  id: string;
  profileId: string;
  date: string;
  gaDays: number;
  standard: ReferenceStandard;
  /** Canonical length unit is cm, including CRL. */
  measurements: Partial<Record<GrowthMetric, number>>;
  efwGrams: number | null;
  formulaVersion: string;
  referenceVersion: string;
}
export type StoreResult = { ok: true } | { ok: false; message: string };
export interface ProfileEntry {
  id: string;
  label: string;
  fetusCount: 1 | 2;
  chorionicity: string;
  state: "active" | "archived";
  basis: SavedBasis | null;
  records: MeasurementSession[];
  basisHistory: SavedBasis[];
  recordHistory: MeasurementSession[];
}
