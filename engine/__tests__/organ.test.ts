import test from "node:test";
import assert from "node:assert/strict";
import { calculateOrganRatio } from "../tools";
test("organ ratios require paired positive measurements and explicit common-phase confirmation", () => {
  assert.equal(calculateOrganRatio("4", "0", true).value, null);
  assert.equal(calculateOrganRatio("4", "2", false).value, null);
  assert.equal(calculateOrganRatio("4", "2", true).value, 2);
  assert.equal(calculateOrganRatio("400", "200", true).value, 2);
});
