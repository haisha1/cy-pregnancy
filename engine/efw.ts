/**
 * Hadlock 四参数估重：先校验与统一单位，再执行论文公式；返回公式及文献 ID，页面仅展示结果。
 */
import type {
  CalculationResult,
  EfwEstimate,
  FetalBiometry,
  LengthUnit,
} from "../types/medical";
import { toCentimeters, validateBiometry } from "./validation";

/** Hadlock 1985 Table II, explicitly identified by inputs rather than ambiguous Roman numerals. */
export function calculateHadlockEfw(
  measurements: FetalBiometry,
  unit: LengthUnit = "cm",
): CalculationResult<EfwEstimate> {
  const referenceIds = ["HADLOCK_EFW_1985"];
  const issues = validateBiometry(measurements, unit);
  if (issues.length)
    return {
      status: "invalid",
      message: issues[0].message,
      issues,
      referenceIds,
    };
  const measurementsCm: FetalBiometry = {
    BPD: toCentimeters(measurements.BPD, unit),
    HC: toCentimeters(measurements.HC, unit),
    AC: toCentimeters(measurements.AC, unit),
    FL: toCentimeters(measurements.FL, unit),
  };
  const { BPD, HC, AC, FL } = measurementsCm;
  // 这里是对象解构，取出四个已统一为 cm 的指标。论文公式先得到 log10(克数)，最后用 10 的幂还原克数。
  // 系数和输入组合属于具体模型版本；维护时需连同公式 ID、文献及测试一起核对，不能随意替换。
  const log10Grams =
    1.3596 -
    0.00386 * AC * FL +
    0.0064 * HC +
    0.00061 * BPD * AC +
    0.0424 * AC +
    0.174 * FL;
  return {
    status: "ready",
    value: {
      grams: 10 ** log10Grams,
      log10Grams,
      formulaId: "HADLOCK_1985_BPD_HC_AC_FL",
      measurementsCm,
      warnings: [
        "超声体重为模型估计值，存在测量与模型误差；需结合连续测量及临床信息解读。",
      ],
    },
    referenceIds,
  };
}
