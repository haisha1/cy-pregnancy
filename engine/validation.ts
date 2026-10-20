/**
 * 共享校验与单位换算：返回结构化错误供不同页面复用；录入范围校验不等于医学正常范围判断。
 */
import type {
  CalculationResult,
  FetalBiometry,
  GrowthMetric,
  LengthUnit,
  ValidationIssue,
} from "../types/medical";

export function invalid<T>(
  field: string,
  code: string,
  message: string,
  referenceIds: string[] = [],
): CalculationResult<T> {
  return {
    status: "invalid",
    message,
    issues: [{ field, code, message }],
    referenceIds,
  };
}

export function validateGestation(
  weeks: number,
  days: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!Number.isInteger(weeks) || weeks < 0 || weeks > 42) {
    issues.push({
      field: "weeks",
      code: "INVALID_WEEKS",
      message: "孕周须为 0–42 的整数",
    });
  }
  if (!Number.isInteger(days) || days < 0 || days > 6) {
    issues.push({
      field: "days",
      code: "INVALID_DAYS",
      message: "孕周余天须为 0–6 的整数",
    });
  }
  return issues;
}

/** Loose entry guards only. These are NOT clinical reference intervals or study validity bounds. */
export const ENTRY_LIMITS_CM: Record<
  keyof FetalBiometry,
  readonly [number, number]
> = {
  BPD: [0.5, 15],
  HC: [2, 60],
  AC: [2, 70],
  FL: [0.2, 12],
};

export function toCentimeters(value: number, unit: LengthUnit): number {
  return unit === "mm" ? value / 10 : value;
}

export function convertLength(
  value: number,
  from: LengthUnit,
  to: LengthUnit,
): number {
  return from === to ? value : from === "cm" ? value * 10 : value / 10;
}

/** valueCm is the canonical length. These limits detect likely entry/unit mistakes only. */
export function validateGrowthMeasurement(
  metric: Exclude<GrowthMetric, "EFW">,
  valueCm: number,
): string | null {
  if (!Number.isFinite(valueCm) || valueCm <= 0)
    return "请填写大于 0 的有效测量值";
  if (metric === "CRL") return null;
  if (!(metric in ENTRY_LIMITS_CM)) return "暂不支持该指标";
  const [min, max] = ENTRY_LIMITS_CM[metric];
  return valueCm < min || valueCm > max
    ? "数值超出录入范围，请确认 cm/mm 单位"
    : null;
}

export function validateBiometry(
  values: FetalBiometry,
  unit: LengthUnit,
): ValidationIssue[] {
  if (unit !== "cm" && unit !== "mm") {
    return [
      {
        field: "unit",
        code: "INVALID_UNIT",
        message: "测量单位仅支持 cm 或 mm",
      },
    ];
  }
  const issues: ValidationIssue[] = [];
  for (const metric of Object.keys(
    ENTRY_LIMITS_CM,
  ) as (keyof FetalBiometry)[]) {
    const value = values?.[metric];
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      issues.push({
        field: metric,
        code: "REQUIRED_MEASUREMENT",
        message: `请填写 ${metric} 的有效测量值`,
      });
      continue;
    }
    const cm = toCentimeters(value, unit);
    const [min, max] = ENTRY_LIMITS_CM[metric];
    if (cm < min || cm > max) {
      issues.push({
        field: metric,
        code: "CHECK_MEASUREMENT_UNIT",
        message: `${metric} 超出录入范围，请确认 cm/mm 单位`,
      });
    }
  }
  return issues;
}

export function validateGrowthInput(
  metric: GrowthMetric,
  gaDays: number,
  value: number,
): ValidationIssue[] {
  if (!["CRL", "BPD", "HC", "AC", "FL", "EFW"].includes(metric)) {
    return [
      { field: "metric", code: "UNKNOWN_METRIC", message: "暂不支持该指标" },
    ];
  }
  if (!Number.isInteger(gaDays) || gaDays < 0 || gaDays > 300) {
    return [
      {
        field: "gaDays",
        code: "INVALID_GESTATION",
        message: "请填写 0–42 周 +6 天以内的有效孕周",
      },
    ];
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return [
      {
        field: "value",
        code: "INVALID_MEASUREMENT",
        message: "测量值须为大于 0 的有效数字",
      },
    ];
  }
  return [];
}
