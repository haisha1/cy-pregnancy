import test from "node:test";
import assert from "node:assert/strict";
// 产物校验器同时供CLI构建使用；这里验证曾导致微信白屏的选择器确实会被阻断。
// @ts-expect-error JavaScript构建脚本不发布TS声明文件。
import { checkSelectors } from "../scripts/check-wxss.mjs";
test("微信WXSS门禁拒绝scoped通配选择器，接受类名及属性中的星号", () => {
  assert.equal(
    checkSelectors(".ga-row > *.data-v-312d8be8 { flex: 1; }").length,
    1,
  );
  assert.equal(checkSelectors(".gestation-fields>* { min-width:0 }").length, 1);
  assert.equal(checkSelectors(".actions>:first-child { flex:1 }").length, 1);
  assert.equal(checkSelectors(".actions>:last-child { flex:1 }").length, 1);
  assert.deepEqual(
    checkSelectors(
      '.ga-context-field.data-v-123 { flex:1 } [data-id*="part"] { color:red }',
    ),
    [],
  );
});
