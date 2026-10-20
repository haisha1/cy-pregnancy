import test from "node:test";
import assert from "node:assert/strict";
import { createPinia, setActivePinia } from "pinia";
import { openMainPage } from "../utils/navigation";
import { useMainNavigationStore } from "../store/mainNavigation";

function setup(routes: string[]) {
  setActivePinia(createPinia());
  const calls: { method: string; value: unknown }[] = [];
  Object.assign(globalThis, {
    getCurrentPages: () => routes.map((route) => ({ route })),
    uni: Object.fromEntries(
      ["navigateBack", "reLaunch", "switchTab", "navigateTo"].map((method) => [
        method,
        (value: unknown) => calls.push({ method, value }),
      ]),
    ),
  });
  return { calls, navigation: useMainNavigationStore() };
}
test("首次及连续点击底栏只切换状态，零页面路由调用", () => {
  const { calls, navigation } = setup(["pages/index/index"]);
  for (const [url, tab] of [
    ["/pages/mine/index", "mine"],
    ["/pages/profile/index", "records"],
    ["/pages/index/index", "tools"],
    ["/pages/index/index", "tools"],
  ]) {
    openMainPage(url);
    assert.equal(navigation.active, tab);
  }
  assert.deepEqual(calls, []);
});
test("二级页返回栈中已有主界面，并打开指定面板", () => {
  const { calls, navigation } = setup([
    "pages/index/index",
    "pages/index/all",
    "pages/pregnancy/edd",
  ]);
  openMainPage("/pages/profile/index");
  assert.equal(navigation.active, "records");
  assert.deepEqual(calls, [{ method: "navigateBack", value: { delta: 2 } }]);
});
test("外部直达二级页时创建正确入口，未知地址不清空页面栈", () => {
  const { calls } = setup(["pages/profile/detail"]);
  openMainPage("/pages/profile/index");
  openMainPage("/pages/unknown/index");
  assert.deepEqual(calls, [
    { method: "reLaunch", value: { url: "/pages/profile/index" } },
  ]);
});
