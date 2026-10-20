import { test, expect } from "@playwright/test";

test("首次及连续切换共用同一个外壳，不调用页面路由，不发起游客账号请求", async ({
  page,
}) => {
  const accountRequests: string[] = [];
  page.on("request", (req) => {
    if (/\/api\/v1\/(auth|me|capabilities)/.test(req.url()))
      accountRequests.push(req.url());
  });
  await page.goto("/#/pages/index/index");
  const shell = page.locator(".ga-page");
  await expect(shell).toBeVisible();
  await shell.evaluate((el) =>
    el.setAttribute("data-shell-proof", "same-shell"),
  );
  await page.evaluate(() => {
    const w = window as any;
    w.mainRouteCalls = [];
    for (const method of [
      "reLaunch",
      "switchTab",
      "navigateTo",
      "redirectTo",
    ]) {
      const original = w.uni[method];
      w.uni[method] = (...args: unknown[]) => {
        w.mainRouteCalls.push(method);
        return original.apply(w.uni, args);
      };
    }
  });
  let mineVisited = false;
  for (const [label, title, panel] of [
    ["我的", "我的", "mine"],
    ["档案", "孕期档案", "records"],
    ["工具", "孕期超声工具", "tools"],
    ["我的", "我的", "mine"],
    ["工具", "孕期超声工具", "tools"],
  ]) {
    await page
      .locator(".ga-bottom")
      .getByRole("button", { name: label, exact: true })
      .click();
    await expect(page.locator(".ga-nav__title")).toHaveText(title);
    await expect(shell).toHaveAttribute("data-shell-proof", "same-shell");
    await expect(
      page.locator(`.ga-main__panel[data-main-panel="${panel}"]`),
    ).toBeVisible();
    await expect(page.locator(".ga-nav")).toHaveCount(1);
    await expect(page.locator(".ga-bottom")).toHaveCount(1);
    if (panel === "mine") {
      const scroll = page.locator(
        '.ga-main__panel[data-main-panel="mine"] .uni-scroll-view[style*="overflow"]',
      );
      if (!mineVisited) {
        await scroll.evaluate((el) => {
          el.scrollTop = 180;
        });
        mineVisited = true;
      }
      await expect
        .poll(() => scroll.evaluate((el) => el.scrollTop))
        .toBeGreaterThan(100);
    }
  }
  expect(await page.evaluate(() => (window as any).mainRouteCalls)).toEqual([]);
  expect(accountRequests).toEqual([]);
  // 二级页返回保留选中面板和原外壳，不创建第二份首页。
  await page
    .locator(".ga-bottom")
    .getByRole("button", { name: "我的", exact: true })
    .click();
  await page.locator(".ga-link-row").filter({ hasText: "通用偏好" }).click();
  await expect(page).toHaveURL(/pages\/mine\/preferences/);
  await page.getByRole("button", { name: "返回上一页" }).click();
  await expect(page.locator(".ga-nav__title")).toHaveText("我的");
  await expect(shell).toHaveAttribute("data-shell-proof", "same-shell");
});
