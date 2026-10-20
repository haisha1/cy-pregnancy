/**
 * 医学计算类型契约：type/interface 只参与 TypeScript 检查，不能代替运行时校验；按 status 区分成功与不可用结果。
 */
/** Shared, serializable contracts for the calculation engine and UI. */
export type ISODate = string;
export type ReferenceStandard = "INTERGROWTH" | "CUHK";
export type GrowthMetric = "CRL" | "BPD" | "HC" | "AC" | "FL" | "EFW";
export type LengthUnit = "cm" | "mm";
export type DatingMethod = "LMP" | "EDD" | "IVF" | "CRL" | "KNOWN_GA";

export interface ValidationIssue {
  field: string;
  code: string;
  message: string;
}

export type CalculationResult<T> =
  | {
      status: "ready";
      value: T;
      referenceIds: string[];
    }
  | {
      status: "invalid" | "unavailable";
      message: string;
      issues: ValidationIssue[];
      referenceIds: string[];
    };

export type PregnancyBasisInput =
  | { method: "LMP" | "EDD"; date: ISODate }
  | { method: "IVF"; date: ISODate; embryoAgeDays: number }
  | { method: "CRL"; date: ISODate; crlMm: number }
  | { method: "KNOWN_GA"; date: ISODate; weeks: number; days: number };

export interface PregnancyBasis {
  method: DatingMethod;
  anchorDate: ISODate;
  lmpEquivalent: ISODate;
  edd: ISODate;
  referenceIds: string[];
  warnings: string[];
  /** Preserve inputs for an auditable local record; never change an established EDD automatically. */
  input: PregnancyBasisInput;
}

export interface GestationSummary {
  weeks: number;
  days: number;
  totalDays: number;
  edd: ISODate;
  lmpEquivalent: ISODate;
  asOfDate: ISODate;
  daysUntilEdd: number;
  progress: number;
  progressPercent: number;
  warnings: string[];
}

export interface FetalBiometry {
  BPD: number;
  HC: number;
  AC: number;
  FL: number;
}

export interface EfwEstimate {
  grams: number;
  log10Grams: number;
  formulaId: "HADLOCK_1985_BPD_HC_AC_FL";
  measurementsCm: FetalBiometry;
  warnings: string[];
}

export interface GrowthAssessment {
  metric: GrowthMetric;
  standard: ReferenceStandard;
  gaDays: number;
  value: number;
  zScore: number;
  percentile: number;
  mean: number;
  low: number;
  high: number;
}

export interface MedicalReference {
  id: string;
  title: string;
  authors: string;
  journal: string;
  year: number;
  doi?: string;
  url: string;
  formula?: string;
  scope: string;
  note?: string;
  verifiedAt: string;
}
