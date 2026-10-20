/**
 * OCR 候选类型：识别文字、置信度、人工确认和舍弃状态分别记录，不能把“识别到”当成“已确认”。
 */
export interface OcrCandidate {
  id: string;
  metric: "CRL" | "BPD" | "HC" | "AC" | "FL";
  rawText: string;
  value: string;
  unit: "cm" | "mm" | "unknown";
  confidence: number | null;
  confirmed: boolean;
  discarded: boolean;
}
export interface OcrReviewContext {
  date: string;
  weeks: string;
  days: string;
  fetus: "singleton" | "A" | "B" | "unknown";
}
