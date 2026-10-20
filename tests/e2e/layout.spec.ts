import { test, expect } from "@playwright/test";

test("游客档案卡片与说明保持独立间距，窄屏不横向溢出", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/#/pages/profile/index");
  const gate = page.locator(".ga-account-gate");
  await expect(gate).toBeVisible();
  const card = await gate.locator(".ga-card").boundingBox();
  const link = await gate.locator(".ga-link-row").boundingBox();
  expect(card).not.toBeNull();
  expect(link!.y - card!.y - card!.height).toBeGreaterThanOrEqual(15);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});

test("公共导航布局使用测得的状态栏与胶囊高度，标题居中且保留返回按钮", async ({
  page,
}) => {
  await page.goto("/#/pages/mine/privacy");
  await expect(page.locator(".ga-nav__title")).toBeVisible();
  // 浏览器验证公共CSS几何，API坐标换算另由纯函数单测覆盖；不代替微信真机。
  for (const [width, status, height, side] of [
    [390, 44, 44, 103],
    [360, 24, 48, 108],
    [393, 59, 44, 110],
  ]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator(".ga-page").evaluate(
      (node, values) => {
        const el = node as HTMLElement;
        el.style.setProperty("--ga-status-height", values[0] + "px");
        el.style.setProperty("--ga-nav-height", values[1] + "px");
        el.style.setProperty("--ga-nav-side", values[2] + "px");
      },
      [status, height, side],
    );
    const nav = await page.locator(".ga-nav").boundingBox();
    const title = await page.locator(".ga-nav__title").boundingBox();
    expect(
      Math.abs(title!.y + title!.height / 2 - nav!.y - status - height / 2),
    ).toBeLessThan(1);
    expect(title!.x).toBeGreaterThanOrEqual(side);
    expect(title!.x + title!.width).toBeLessThanOrEqual(width - side);
    await expect(
      page.getByRole("button", { name: "返回上一页" }),
    ).toBeVisible();
  }
});
