import test from "node:test";
import assert from "node:assert/strict";
import { validateOcrReview } from "../ocr";
import type { OcrCandidate } from "../../types/ocr";
const context = {
  date: "2026-10-19",
  weeks: "28",
  days: "5",
  fetus: "A" as const,
};
const field: OcrCandidate = {
  id: "f1",
  metric: "HC",
  rawText: "HC 286 mm",
  value: "286",
  unit: "mm",
  confidence: 0.8,
  confirmed: false,
  discarded: false,
};
test("OCR review never silently promotes unconfirmed fields, missing units, or ambiguous duplicate values", () => {
  assert.ok(
    validateOcrReview([field], context).some((e) => e.includes("尚未逐项确认")),
  );
  assert.ok(
    validateOcrReview(
      [{ ...field, confirmed: true, unit: "unknown" }],
      context,
    ).some((e) => e.includes("单位尚未确认")),
  );
  assert.ok(
    validateOcrReview(
      [
        { ...field, confirmed: true },
        { ...field, id: "f2", confirmed: true },
      ],
      context,
    ).some((e) => e.includes("同名多值")),
  );
  assert.deepEqual(
    validateOcrReview([{ ...field, confirmed: true }], context),
    [],
  );
});
test("OCR context and discarded fields cannot become an empty or misattributed clinical record", () => {
  assert.ok(
    validateOcrReview(
      [{ ...field, confirmed: true, discarded: true }],
      context,
    ).includes("尚无保留的识别字段"),
  );
  assert.ok(
    validateOcrReview([{ ...field, confirmed: true }], {
      ...context,
      date: "",
      fetus: "unknown",
      days: "7",
    }).length >= 3,
  );
});
