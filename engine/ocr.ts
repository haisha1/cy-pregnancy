/**
 * OCR 核对校验：只处理已传入的候选字段与检查信息，不发起图片识别；人工确认是进入后续录入的前提。
 */
import type { OcrCandidate, OcrReviewContext } from "../types/ocr";
import { isValidISODate, gestationToDays } from "./gestation";
import { convertLength, validateGrowthMeasurement } from "./validation";
/** OCR candidates never become stored measurements without this explicit review boundary. */
export function validateOcrReview(
  fields: OcrCandidate[],
  context: OcrReviewContext,
): string[] {
  const errors: string[] = [];
  if (!isValidISODate(context.date)) errors.push("请核对报告检查日期");
  if (
    !context.weeks.trim() ||
    gestationToDays(Number(context.weeks), Number(context.days)).status !==
      "ready"
  )
    errors.push("请核对报告孕周");
  if (context.fetus === "unknown") errors.push("请明确胎儿归属");
  const kept = fields.filter((f) => !f.discarded);
  if (!kept.length) errors.push("尚无保留的识别字段");
  const seen = new Set<string>();
  for (const field of kept) {
    if (seen.has(field.metric))
      errors.push(`${field.metric}存在同名多值，请先选择或舍弃`);
    seen.add(field.metric);
    if (!field.confirmed) errors.push(`${field.metric}尚未逐项确认`);
    if (field.unit === "unknown") errors.push(`${field.metric}单位尚未确认`);
    else if (
      !field.value.trim() ||
      validateGrowthMeasurement(
        field.metric,
        convertLength(Number(field.value), field.unit, "cm"),
      )
    )
      errors.push(`${field.metric}测量值无效，请核对原报告`);
  }
  return errors;
}
