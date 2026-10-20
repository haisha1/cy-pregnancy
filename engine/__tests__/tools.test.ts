import test from "node:test";
import assert from "node:assert/strict";
import { getTool, toolDefinitions } from "../../data/tool-definitions";
import { calculateTool, convertDimension, resolveExamDays } from "../tools";
const calculate = (
  key: string,
  raw: Record<string, string>,
  unit: "cm" | "mm" = "cm",
) => calculateTool(getTool(key)!, raw, unit);
test("CPR requires a positive denominator and explicit same-exam same-fetus confirmation", () => {
  assert.equal(
    calculate("cpr", { mca: "1.8", ua: "0", sameExam: "已核对一致" }).status,
    "invalid",
  );
  assert.equal(
    calculate("cpr", { mca: "1.8", ua: ".9", sameExam: "unknown" }).status,
    "invalid",
  );
  assert.equal(
    calculate("cpr", { mca: "1.8", ua: ".9", sameExam: "已核对一致" }).values[0]
      .value,
    2,
  );
  assert.equal(calculate("cpr", { mca: "1.8" }).status, "incomplete");
});
test("UtA requires both sides, preserving a separately transcribed reported mean", () => {
  assert.equal(
    calculate("uta", { left: "1.2", reported: "1.5" }).values.length,
    0,
  );
  assert.equal(
    calculate("uta", { left: "1.2", right: ".8", reported: "1.5" }).values[0]
      .value,
    1,
  );
});
test("AFI sum preserves zero pockets and differentiates partial sum and complete four-quadrant sum", () => {
  const partial = calculate("afi", { q1: "2", q2: "3", q3: "0" });
  assert.match(partial.values[0].label, /不是完整/);
  assert.equal(partial.values[0].value, 5);
  assert.equal(
    calculate("afi", { q1: "20", q2: "30", q3: "0", q4: "10" }, "mm").values[0]
      .value,
    6,
  );
  assert.equal(calculate("afi", { q1: "-1" }).status, "invalid");
  assert.equal(calculate("afi", {}).values.length, 0);
});
test("twin arithmetic uses the larger EFW denominator without exchanging A and B", () => {
  const a = calculate("twin-growth", {
    a: "1000",
    b: "800",
    sameExam: "已核对一致",
  });
  const b = calculate("twin-growth", {
    a: "800",
    b: "1000",
    sameExam: "已核对一致",
  });
  assert.equal(a.values[0].value, 20);
  assert.equal(b.values[0].value, 20);
  assert.equal(
    calculate("twin-growth", { a: "1000", b: "800", sameExam: "unknown" })
      .status,
    "incomplete",
  );
});
test("age is calendar age at EDD, with no stored birthday or disease probability in output", () => {
  assert.equal(
    calculate("age", { dob: "1990-02-05", edd: "2027-02-04" }).values[0].value,
    36,
  );
  assert.equal(
    calculate("age", { dob: "1990-02-05", edd: "2027-02-05" }).values[0].value,
    37,
  );
  assert.equal(
    calculate("age", { dob: "2026-02-30", edd: "2027-02-05" }).status,
    "invalid",
  );
  const result = calculate("age", { dob: "1990-02-05", edd: "2027-02-05" });
  assert.ok(!JSON.stringify(result).includes("1990-02-05"));
  assert.deepEqual(result.normalized, {});
});
test("length and area units retain physical quantity over repeated switches", () => {
  let length = "3.21585",
    area = "1.3596";
  for (let i = 0; i < 30; i++) {
    length = convertDimension(
      convertDimension(length, "cm", "mm", "length"),
      "mm",
      "cm",
      "length",
    );
    area = convertDimension(
      convertDimension(area, "cm", "mm", "area"),
      "mm",
      "cm",
      "area",
    );
  }
  assert.equal(length, "3.21585");
  assert.equal(area, "1.3596");
});
test("unapproved specialty models never generate stages, doses, scores, or percentile values", () => {
  for (const definition of toolDefinitions.filter((t) => t.highRisk)) {
    const raw = Object.fromEntries(
      definition.fields.map((f) => [
        f.key,
        f.kind === "choice" ? "unknown" : "1",
      ]),
    );
    const result = calculateTool(definition, raw, "cm");
    assert.equal(result.status, "unavailable", definition.key);
    assert.deepEqual(result.values, [], definition.key);
  }
});
test("observation context rejects invalid remainder and does not mutate the dating basis", () => {
  const basis = { lmpEquivalent: "2026-04-30" };
  assert.equal(
    resolveExamDays(
      { date: "2026-10-18", weeks: "", days: "", manual: false },
      basis,
    ),
    171,
  );
  assert.equal(
    resolveExamDays(
      { date: "2026-10-18", weeks: "24", days: "7", manual: true },
      basis,
    ),
    null,
  );
  assert.equal(basis.lmpEquivalent, "2026-04-30");
});
