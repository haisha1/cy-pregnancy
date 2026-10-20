import test from "node:test";
import assert from "node:assert/strict";
import { createPinia, setActivePinia } from "pinia";
import { useProfileStore } from "../store/profile";
import { STORAGE_KEYS } from "../utils/storage";
import { createPregnancyBasis } from "../engine/gestation";
const memory = new Map<string, string>();
let failWrites = false;
Object.assign(globalThis, {
  uni: {
    getStorageSync: (key: string) => memory.get(key) ?? "",
    setStorageSync: (key: string, value: string) => {
      if (failWrites) throw new Error("quota");
      memory.set(key, value);
    },
    showToast: () => {},
  },
});
function reset() {
  memory.clear();
  failWrites = false;
  setActivePinia(createPinia());
  return useProfileStore();
}
const input = {
  date: "2026-10-12",
  gaDays: 212,
  standard: "INTERGROWTH" as const,
  measurements: { HC: 28.6 },
  efwGrams: null,
  formulaVersion: "",
  referenceVersion: "test-version",
};

test("saved basis keeps original IVF input and reloads without losing provenance", () => {
  const store = reset();
  const basis = createPregnancyBasis({
    method: "IVF",
    date: "2026-04-10",
    embryoAgeDays: 5,
  });
  assert.equal(basis.status, "ready");
  if (basis.status !== "ready") throw new Error("basis failed");
  assert.equal(store.saveBasis(basis.value).ok, true);
  setActivePinia(createPinia());
  const restored = useProfileStore();
  restored.hydrate();
  assert.deepEqual(restored.basis?.input, basis.value.input);
  assert.deepEqual(restored.basis?.referenceIds, basis.value.referenceIds);
});
test("same-date overwrite is explicit and deleting one record leaves other records intact", () => {
  const store = reset();
  assert.equal(store.saveMeasurement(input).ok, false);
  store.saveBasis({ method: "LMP", lmpEquivalent: "2026-03-14" });
  assert.equal(store.saveMeasurement(input).ok, true);
  assert.equal(
    store.saveMeasurement({ ...input, measurements: { HC: 29 } }).ok,
    false,
  );
  assert.equal(store.records[0].measurements.HC, 28.6);
  assert.equal(
    store.saveMeasurement({ ...input, measurements: { HC: 29 } }, true).ok,
    true,
  );
  assert.equal(store.records.length, 1);
  store.saveMeasurement({ ...input, date: "2026-10-18" });
  const oldId = store.records[1].id;
  assert.equal(store.removeMeasurement(oldId).ok, true);
  assert.equal(store.records.length, 1);
  assert.equal(store.records[0].date, "2026-10-18");
});
test("storage write failures do not mutate saved in-memory basis or measurements", () => {
  const store = reset();
  store.saveBasis({ method: "LMP", lmpEquivalent: "2026-03-14" });
  const before = JSON.stringify(store.basis);
  failWrites = true;
  assert.equal(
    store.saveBasis({ method: "LMP", lmpEquivalent: "2026-04-01" }).ok,
    false,
  );
  assert.equal(JSON.stringify(store.basis), before);
  assert.equal(store.saveMeasurement(input).ok, false);
  assert.equal(store.records.length, 0);
});
test("corrupt storage is preserved and blocks destructive replacement", () => {
  const store = reset();
  memory.set(STORAGE_KEYS.profile, "{broken");
  store.hydrate();
  assert.ok(store.storageError);
  assert.equal(
    store.saveBasis({ method: "LMP", lmpEquivalent: "2026-03-14" }).ok,
    false,
  );
  assert.equal(memory.get(STORAGE_KEYS.profile), "{broken");
});
test("storage rejects impossible dates, nonfinite measurements and wrong metrics, accepts 42+6 snapshot", () => {
  const store = reset();
  assert.equal(
    store.saveBasis({ method: "LMP", lmpEquivalent: "2026-02-30" }).ok,
    false,
  );
  store.saveBasis({ method: "LMP", lmpEquivalent: "2026-03-14" });
  assert.equal(
    store.saveMeasurement({ ...input, date: "2026-02-30" }).ok,
    false,
  );
  assert.equal(
    store.saveMeasurement({ ...input, measurements: { HC: Infinity } }).ok,
    false,
  );
  assert.equal(
    store.saveMeasurement({ ...input, measurements: { HC: 286 } }).ok,
    false,
  );
  assert.equal(store.saveMeasurement({ ...input, gaDays: 300 }).ok, true);
});
test("profile switching keeps pregnancies and fetal identities isolated, and basis changes preserve snapshots", () => {
  const store = reset();
  store.createProfile("第一孕期", 1);
  const first = store.activeProfileId;
  store.saveBasis({ method: "LMP", lmpEquivalent: "2026-03-14" });
  store.saveMeasurement(input);
  store.saveBasis({ method: "LMP", lmpEquivalent: "2026-03-15" });
  assert.equal(store.records[0].gaDays, input.gaDays);
  assert.equal(store.profiles[0].basisHistory.length, 1);
  store.createProfile("双胎孕期", 2, "MCDA");
  const second = store.activeProfileId;
  store.saveBasis({ method: "LMP", lmpEquivalent: "2026-04-01" });
  assert.equal(store.saveMeasurement(input).ok, false);
  assert.equal(
    store.saveMeasurement({ ...input, fetus: "A" }, false, true).ok,
    true,
  );
  assert.equal(
    store.saveMeasurement({ ...input, fetus: "B" }, false, true).ok,
    true,
  );
  assert.equal(store.records.length, 2);
  store.switchProfile(first);
  assert.equal(store.records.length, 1);
  assert.equal(store.records[0].gaDays, input.gaDays);
  store.switchProfile(second);
  assert.deepEqual(store.records.map((r) => r.fetus).sort(), ["A", "B"]);
});
test("same-day sessions may be kept separately and explicit edits retain revision history", () => {
  const store = reset();
  store.saveBasis({ method: "LMP", lmpEquivalent: "2026-03-14" });
  store.saveMeasurement(input, false, true);
  store.saveMeasurement(input, false, true);
  assert.equal(store.records.length, 2);
  const selected = store.records[1].id;
  store.saveMeasurement(
    { ...input, measurements: { HC: 29 } },
    true,
    false,
    selected,
  );
  assert.equal(store.records.length, 2);
  assert.equal(
    store.records.find((r) => r.id === selected)?.measurements.HC,
    29,
  );
  assert.equal(store.profiles[0].recordHistory.length, 1);
  assert.equal(store.profiles[0].recordHistory[0].measurements.HC, 28.6);
});
