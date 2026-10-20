import test from "node:test";
import assert from "node:assert/strict";
import { navigationMetrics } from "../utils/navigationMetrics";

test("导航根据胶囊实际中心对齐，左右对称避让，不假设刘海屏高度", () => {
  for (const [status, top, height, width, left] of [
    [44, 50, 32, 390, 295],
    [24, 32, 32, 360, 260],
    [59, 65, 32, 393, 291],
  ]) {
    const layout = navigationMetrics(status, width, {
      top,
      bottom: top + height,
      height,
      left,
    });
    assert.equal(layout.status + layout.height / 2, top + height / 2);
    assert.ok(layout.side >= width - left);
  }
});
test("胶囊暂不可用或返回零矩形时仍保留状态栏安全区", () => {
  assert.deepEqual(navigationMetrics(44, 390), {
    status: 44,
    height: 44,
    side: 52,
  });
  assert.deepEqual(
    navigationMetrics(44, 390, { top: 0, bottom: 0, left: 0, height: 0 }),
    { status: 44, height: 44, side: 52 },
  );
});
