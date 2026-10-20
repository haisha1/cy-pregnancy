import assert from "node:assert/strict";
import test from "node:test";
import type {
  CalculationResult,
  FetalBiometry,
  GrowthMetric,
} from "../../types/medical";
import { calculateHadlockEfw } from "../efw";
import { assessGrowth } from "../growth";
import { convertLength, validateGrowthMeasurement } from "../validation";
import { getReferences, REFERENCE_VERSION } from "../../data/references";

function ready<T>(result: CalculationResult<T>): T {
  if (result.status !== "ready") throw new Error(result.message);
  return result.value;
}

test("1985 Table II four-parameter formula matches fixed arithmetic regression vectors", () => {
  // The first input vector appears in the original paper pp.335–337.
  // Its four-parameter output below is an equation check, NOT the different model's published outcome.
  // The remaining vectors are explicit engineering fixtures, NOT invented clinical cases.
  const fixtures: [FetalBiometry, number, number][] = [
    [{ BPD: 5.7, HC: 21.3, AC: 28.5, FL: 7.5 }, 3.2833395, 1920.1692034552957],
    [{ BPD: 8.5, HC: 31, AC: 28, FL: 6.5 }, 3.31886, 2083.8190309241363],
    [{ BPD: 9.2, HC: 33, AC: 34, FL: 7.1 }, 3.506804, 3212.2105194039673],
  ];
  for (const [measurements, logWeight, grams] of fixtures) {
    const result = ready(calculateHadlockEfw(measurements));
    assert.ok(Math.abs(result.log10Grams - logWeight) < 1e-12);
    assert.ok(Math.abs(result.grams - grams) / grams < 0.000001);
    assert.equal(result.formulaId, "HADLOCK_1985_BPD_HC_AC_FL");
  }
});

test("mm/cm conversion yields identical grams and preserves all four inputs", () => {
  const cm = ready(calculateHadlockEfw({ BPD: 8.5, HC: 31, AC: 28, FL: 6.5 }));
  const mm = ready(
    calculateHadlockEfw({ BPD: 85, HC: 310, AC: 280, FL: 65 }, "mm"),
  );
  assert.equal(mm.grams, cm.grams);
  assert.deepEqual(mm.measurementsCm, cm.measurementsCm);
  assert.equal(convertLength(65, "mm", "cm"), 6.5);
  assert.equal(convertLength(6.5, "cm", "mm"), 65);
  const changedHc = ready(
    calculateHadlockEfw({ BPD: 8.5, HC: 32, AC: 28, FL: 6.5 }),
  );
  assert.notEqual(
    changedHc.grams,
    cm.grams,
    "HC must participate; a three-parameter formula is not Hadlock BPD/HC/AC/FL",
  );
});

test("missing measurements, nonfinite values and likely wrong units cannot generate EFW", () => {
  const valid = { BPD: 8.5, HC: 31, AC: 28, FL: 6.5 };
  for (const metric of ["BPD", "HC", "AC", "FL"] as const) {
    for (const invalid of [0, -1, NaN, Infinity, undefined]) {
      const result = calculateHadlockEfw({
        ...valid,
        [metric]: invalid,
      } as FetalBiometry);
      assert.equal(result.status, "invalid");
      assert.ok(result.issues.some((issue) => issue.field === metric));
    }
  }
  assert.equal(
    calculateHadlockEfw({ BPD: 85, HC: 310, AC: 280, FL: 65 }, "cm").status,
    "invalid",
  );
  assert.equal(
    validateGrowthMeasurement("HC", 61),
    "数值超出录入范围，请确认 cm/mm 单位",
  );
});

test("unverified growth standards never emit a plausible percentile or normal/abnormal classification", () => {
  for (const standard of ["INTERGROWTH", "CUHK"] as const) {
    for (const metric of [
      "CRL",
      "BPD",
      "HC",
      "AC",
      "FL",
      "EFW",
    ] as GrowthMetric[]) {
      const result = assessGrowth(metric, 171, 30, standard);
      assert.equal(result.status, "unavailable");
      assert.equal("value" in result, false);
      assert.equal("percentile" in result, false);
      assert.equal(result.issues[0].code, "REFERENCE_NOT_VERIFIED");
    }
  }
  assert.equal(assessGrowth("HC", -1, 30).status, "invalid");
  assert.equal(assessGrowth("HC", 171, NaN).status, "invalid");
});

test("ready EFW results resolve an auditable 1985 reference and version", () => {
  const result = calculateHadlockEfw({ BPD: 8.5, HC: 31, AC: 28, FL: 6.5 });
  const refs = getReferences(result.referenceIds);
  assert.equal(refs.length, 1);
  assert.equal(refs[0].year, 1985);
  assert.match(refs[0].doi ?? "", /90298-4/);
  assert.ok(REFERENCE_VERSION.length > 0);
});
