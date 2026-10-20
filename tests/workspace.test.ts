import test from "node:test";
import assert from "node:assert/strict";
import { createPinia, setActivePinia } from "pinia";
import { useWorkspaceStore } from "../store/workspace";
import { todayISO } from "../engine/gestation";
const memory = new Map<string, string>();
let failed = false;
Object.assign(globalThis, {
  uni: {
    getStorageSync: (key: string) => memory.get(key) ?? "",
    setStorageSync: (key: string, value: string) => {
      if (failed) throw Error("quota");
      memory.set(key, value);
    },
  },
});
const reset = () => {
  memory.clear();
  failed = false;
  setActivePinia(createPinia());
  return useWorkspaceStore();
};
const input = {
  profileId: "profile-one",
  tool: "cpr",
  date: todayISO(),
  gaDays: 200,
  fetus: "singleton",
  raw: { mca: "1.8", ua: ".9" },
  unit: "cm" as const,
  normalized: { mca: 1.8, ua: 0.9 },
  status: "ready",
  formulaId: "CPR_MCA_PI_DIV_UA_PI_V1",
  referenceIds: ["DOPPLER_CPR_2018"],
  values: [{ label: "CPR", value: 2, unit: "无量纲" }],
};
test("observation storage rejects DOB, future reports and nonfinite normalized values", () => {
  const store = reset();
  assert.equal(
    store.saveObservation({ ...input, tool: "age", raw: { dob: "1990-02-05" } })
      .ok,
    false,
  );
  assert.equal(
    store.saveObservation({ ...input, date: "9999-12-31" }).ok,
    false,
  );
  assert.equal(
    store.saveObservation({ ...input, normalized: { mca: Infinity } }).ok,
    false,
  );
  assert.equal(store.state.observations.length, 0);
  assert.equal(store.saveObservation(input).ok, true);
});
test("failed draft and observation writes preserve the previously committed workspace", () => {
  const store = reset();
  assert.equal(store.saveDraft("one", { mvp: "30", __unit: "mm" }).ok, true);
  const before = JSON.stringify(store.state);
  failed = true;
  assert.equal(store.saveDraft("one", { mvp: "3" }).ok, false);
  assert.equal(store.saveObservation(input).ok, false);
  assert.equal(JSON.stringify(store.state), before);
});
test("appointments revise by UUID without duplicates and retain the real reminder-unavailable state", () => {
  const store = reset();
  const plan = {
    profileId: "one",
    name: "用户复查",
    date: todayISO(),
    time: "08:30",
    location: "",
    note: "",
    status: "booked" as const,
  };
  assert.equal(store.saveAppointment(plan).ok, true);
  const id = store.state.appointments[0].id;
  assert.equal(
    store.saveAppointment({ ...plan, id, status: "completed" }).ok,
    true,
  );
  assert.equal(store.state.appointments.length, 1);
  assert.equal(store.state.appointments[0].revision, 2);
  assert.equal(store.state.appointments[0].reminder, "not_enabled");
  assert.equal(
    store.saveAppointment({ ...plan, id, profileId: "two" }).ok,
    false,
  );
});
