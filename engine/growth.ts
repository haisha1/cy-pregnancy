/**
 * 生长评估入口：校验指标、孕周和标准。当前没有通过核验的分布参数，因此返回 unavailable 而非猜测百分位。
 */
import type {
  CalculationResult,
  GrowthAssessment,
  GrowthMetric,
  ReferenceStandard,
} from "../types/medical";
import { validateGrowthInput } from "./validation";

/** value is canonical cm for lengths (including CRL), g for EFW. No guessed reference distributions are shipped. */
export function assessGrowth(
  metric: GrowthMetric,
  gaDays: number,
  value: number,
  standard: ReferenceStandard = "INTERGROWTH",
): CalculationResult<GrowthAssessment> {
  const issues = validateGrowthInput(metric, gaDays, value);
  if (issues.length)
    return {
      status: "invalid",
      message: issues[0].message,
      issues,
      referenceIds: [],
    };
  if (standard !== "INTERGROWTH" && standard !== "CUHK") {
    return {
      status: "invalid",
      message: "请选择支持的参考标准",
      issues: [
        {
          field: "standard",
          code: "UNKNOWN_STANDARD",
          message: "请选择支持的参考标准",
        },
      ],
      referenceIds: [],
    };
  }
  return {
    status: "unavailable",
    message: `${standard === "INTERGROWTH" ? "INTERGROWTH-21st" : "CUHK"} ${metric} 参考参数尚未完成核验，暂不计算百分位与参考区间`,
    issues: [
      {
        field: "reference",
        code: "REFERENCE_NOT_VERIFIED",
        message: "缺少已复核的孕周适用范围、回归系数及分布模型",
      },
    ],
    referenceIds: standard === "INTERGROWTH" ? ["INTERGROWTH_STANDARDS"] : [],
  };
}
