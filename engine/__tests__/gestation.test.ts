import assert from "node:assert/strict";
import test from "node:test";
import type { CalculationResult } from "../../types/medical";
import {
  addDays,
  createPregnancyBasis,
  crlToGestationDays,
  dateAtGestation,
  diffDays,
  formatGestation,
  gestationToDays,
  gestationWarning,
  getPregnancySummary,
  isValidISODate,
  splitGestation,
  validateMeasurementDate,
} from "../gestation";

function ready<T>(result: CalculationResult<T>): T {
  if (result.status !== "ready") throw new Error(result.message);
  return result.value;
}

test("strict calendar parsing rejects rolled-over dates and timestamps", () => {
  for (const date of [
    "2025-02-29",
    "2026-02-30",
    "2026-13-01",
    "2026-00-10",
    "2026-1-01",
    "2026-10-18T00:00:00Z",
    "",
    "0000-01-01",
  ]) {
    assert.equal(isValidISODate(date), false, date);
  }
  assert.equal(isValidISODate("2024-02-29"), true);
  assert.equal(isValidISODate("1900-02-29"), false);
  assert.equal(isValidISODate("2000-02-29"), true);
  assert.throws(() => addDays("2026-02-30", 1), RangeError);
  assert.throws(() => addDays("2026-10-18", 0.5), RangeError);
  assert.throws(() => addDays("9999-12-31", 1), RangeError);
});

test("calendar arithmetic handles leap days, year changes and both DST boundaries", () => {
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(addDays("2024-02-29", 1), "2024-03-01");
  assert.equal(addDays("2025-01-01", -1), "2024-12-31");
  assert.equal(diffDays("2026-03-09", "2026-03-08"), 1);
  assert.equal(diffDays("2026-11-02", "2026-11-01"), 1);
  assert.equal(addDays("0099-12-31", 1), "0100-01-01");
});

test("calendar results are identical in device time zones that cross DST and the date line", () => {
  const originalZone = process.env.TZ;
  try {
    for (const zone of [
      "America/New_York",
      "Pacific/Auckland",
      "Pacific/Kiritimati",
      "Asia/Shanghai",
    ]) {
      process.env.TZ = zone;
      assert.equal(diffDays("2026-03-09", "2026-03-07"), 2, zone);
      assert.equal(diffDays("2026-11-02", "2026-10-31"), 2, zone);
      assert.equal(addDays("2026-03-07", 2), "2026-03-09", zone);
      assert.equal(addDays("2026-10-31", 2), "2026-11-02", zone);
      assert.equal(
        ready(createPregnancyBasis({ method: "LMP", date: "2026-01-01" })).edd,
        "2026-10-08",
        zone,
      );
    }
  } finally {
    if (originalZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalZone;
  }
});

test("LMP +280 days, known EDD and known GA produce the same basis", () => {
  const lmp = ready(
    createPregnancyBasis({ method: "LMP", date: "2026-01-01" }),
  );
  assert.equal(lmp.edd, "2026-10-08");
  const edd = ready(
    createPregnancyBasis({ method: "EDD", date: "2026-10-08" }),
  );
  const known = ready(
    createPregnancyBasis({
      method: "KNOWN_GA",
      date: "2026-06-21",
      weeks: 24,
      days: 3,
    }),
  );
  assert.equal(edd.lmpEquivalent, lmp.lmpEquivalent);
  assert.equal(known.lmpEquivalent, lmp.lmpEquivalent);
  const summary = ready(
    getPregnancySummary({ lmpEquivalent: lmp.lmpEquivalent }, "2026-06-21"),
  );
  assert.deepEqual(
    [summary.weeks, summary.days, summary.totalDays, summary.daysUntilEdd],
    [24, 3, 171, 109],
  );
  assert.equal(summary.progressPercent, 61);
  assert.equal(ready(dateAtGestation(lmp, 24, 3)), "2026-06-21");
});

test("ACOG ART examples: D3 ->263 days and D5 ->261 days after transfer", () => {
  for (const [embryoAgeDays, expectedOffset, expectedGa] of [
    [3, 263, 17],
    [5, 261, 19],
  ]) {
    const basis = ready(
      createPregnancyBasis({
        method: "IVF",
        date: "2026-01-20",
        embryoAgeDays,
      }),
    );
    assert.equal(diffDays(basis.edd, "2026-01-20"), expectedOffset);
    assert.equal(
      ready(getPregnancySummary(basis, "2026-01-20")).totalDays,
      expectedGa,
    );
  }
});

test("IVF valid custom embryo age follows 14+age without off-by-three error", () => {
  const basis = ready(
    createPregnancyBasis({
      method: "IVF",
      date: "2026-01-20",
      embryoAgeDays: 6,
    }),
  );
  assert.equal(basis.lmpEquivalent, "2025-12-31");
  assert.equal(diffDays(basis.edd, "2026-01-20"), 260);
  for (const age of [-1, 0, 8, 3.5, NaN, Infinity]) {
    assert.equal(
      createPregnancyBasis({
        method: "IVF",
        date: "2026-01-20",
        embryoAgeDays: age,
      }).status,
      "invalid",
    );
  }
});

test("CRL fixed equation check values preserve precision before daily rounding", () => {
  // Numerical regression fixtures from the verified 2014 equation, not published patient outcomes.
  for (const [crl, exactDays, rounded] of [
    [20, 62.2649384108854, 62],
    [45, 78.1796976163281, 78],
    [60, 86.75132698780224, 87],
  ]) {
    const result = ready(crlToGestationDays(crl));
    assert.ok(Math.abs(result.unroundedDays - exactDays) < 1e-10);
    assert.equal(result.totalDays, rounded);
  }
  const basis = ready(
    createPregnancyBasis({ method: "CRL", date: "2026-04-01", crlMm: 60 }),
  );
  assert.equal(ready(getPregnancySummary(basis, "2026-04-01")).totalDays, 87);
});

test("CRL allows published independent-variable boundaries and rejects extrapolation", () => {
  assert.equal(ready(crlToGestationDays(15)).totalDays, 59);
  assert.equal(ready(crlToGestationDays(95)).totalDays, 105);
  for (const crl of [14.999, 95.001, -1, 0, NaN, Infinity])
    assert.equal(crlToGestationDays(crl).status, "invalid");
  assert.ok(
    ready(
      createPregnancyBasis({ method: "CRL", date: "2026-04-01", crlMm: 95 }),
    ).warnings.some((message) => message.includes("医生")),
  );
});

test("invalid gestational components are rejected instead of normalized silently", () => {
  for (const [weeks, days] of [
    [-1, 0],
    [43, 0],
    [24.5, 0],
    [24, 7],
    [24, -1],
    [24, 0.5],
    [NaN, 1],
  ]) {
    assert.equal(gestationToDays(weeks, days).status, "invalid");
    assert.equal(
      createPregnancyBasis({
        method: "KNOWN_GA",
        date: "2026-06-21",
        weeks,
        days,
      }).status,
      "invalid",
    );
  }
  assert.equal(ready(gestationToDays(42, 6)).totalDays, 300);
  assert.deepEqual(splitGestation(171), { weeks: 24, days: 3 });
  assert.equal(formatGestation(171), "24周+3天");
  assert.equal(formatGestation(-1), "—");
});

test("summary distinguishes before-basis date, due date and postterm followup", () => {
  const basis = ready(
    createPregnancyBasis({ method: "LMP", date: "2026-01-01" }),
  );
  assert.equal(getPregnancySummary(basis, "2025-12-31").status, "invalid");
  assert.equal(ready(getPregnancySummary(basis, basis.edd)).daysUntilEdd, 0);
  const after = ready(getPregnancySummary(basis, "2026-10-22"));
  assert.deepEqual(
    [after.weeks, after.days, after.daysUntilEdd, after.progressPercent],
    [42, 0, -14, 100],
  );
  assert.ok(after.warnings.some((message) => message.includes("42 周")));
  assert.ok(
    getPregnancySummary(basis, "2026-10-22").referenceIds.includes(
      "ACOG_TERM_2013",
    ),
  );
  assert.equal(
    basis.referenceIds.includes("ACOG_TERM_2013"),
    false,
    "summary cannot mutate a saved basis citation snapshot",
  );
  assert.equal(
    getPregnancySummary({ ...basis, edd: "2026-10-09" }, "2026-06-21").status,
    "invalid",
  );
  assert.equal(
    getPregnancySummary({ lmpEquivalent: "9999-12-31" }, "9999-12-31").status,
    "invalid",
  );
});

test("measurement dates reject future observations while allowing a same-day report", () => {
  assert.equal(validateMeasurementDate("2026-10-18", "2026-10-18"), null);
  assert.equal(validateMeasurementDate("2024-02-29", "2026-10-18"), null);
  assert.match(
    validateMeasurementDate("2026-10-19", "2026-10-18") ?? "",
    /不能晚于今天/,
  );
  assert.match(
    validateMeasurementDate("2026-02-30", "2026-10-18") ?? "",
    /有效/,
  );
  assert.match(validateMeasurementDate("2026-10-18", "bad") ?? "", /设备日期/);
});

test("gestation warning threshold includes exactly 42+0 and remains advisory after 42+6", () => {
  assert.equal(gestationWarning(293), null);
  assert.match(gestationWarning(294) ?? "", /42 周/);
  assert.match(gestationWarning(300) ?? "", /42 周/);
  assert.match(gestationWarning(301) ?? "", /医生/);
  assert.equal(gestationWarning(NaN), null);
});
