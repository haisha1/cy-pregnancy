import { expect, test, type Page } from "@playwright/test";
import { installAccountFixture } from "../support/accountFixture";

const date = "2026-10-18";
const field = (page: Page, label: string) =>
  page.locator(".ga-field").filter({ hasText: label }).locator("input");
const tab = (page: Page, label: string) =>
  page.locator(".ga-tab").filter({ hasText: new RegExp(`^${label}$`) });
const save = (page: Page) =>
  page.locator(".ga-button--primary").filter({ hasText: "保存为我的孕期基准" });

test.beforeEach(async ({ page }) => {
  await installAccountFixture(page);
  await page.clock.setFixedTime(new Date("2026-10-18T04:00:00Z"));
});

async function enterKnownGestation(page: Page, weeks = "24", days = "3") {
  await page.goto("/#/pages/pregnancy/edd");
  await tab(page, "已知孕周").click();
  await field(page, "该日孕周").fill(weeks);
  await field(page, "另加天数").fill(days);
}

test("新设备呈现真实空态，工具入口可达且模型门禁仍保留", async ({ page }) => {
  await page.goto("/#/pages/index/index");
  await expect(page.getByText("从了解孕周开始", { exact: true })).toBeVisible();
  await expect(page.locator(".ga-hero")).toHaveCount(0);
  await expect(page.locator(".ga-tool[disabled]")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "白话版", exact: true }),
  ).toHaveCount(0);
  await page.getByText("全部工具", { exact: true }).click();
  await expect(page).toHaveURL(/pages\/index\/all/);
  await expect(page.getByText("孕期计算工具", { exact: true })).toBeVisible();
});

test("建立基准、双向查询与刷新持久化，覆盖前可取消", async ({ page }) => {
  await page.goto("/#/pages/pregnancy/edd");
  await expect(save(page)).toHaveAttribute("disabled", "true");
  await tab(page, "已知孕周").click();
  await field(page, "该日孕周").fill("24");
  await field(page, "另加天数").fill("3");
  await expect(page.locator(".gestation")).toHaveText("24周+3天");
  await expect(page.locator(".result")).toContainText("2027-02-04");
  await expect(page.locator(".query-result")).toHaveText(`${date} · 24周+3天`);
  await tab(page, "查某孕周的日期").click();
  await field(page, "要查询的孕周").fill("28");
  await expect(page.locator(".query-result")).toHaveText("对应日期 2026-11-12");
  await save(page).click();
  await expect(page).toHaveURL(/pages\/profile\/index/);
  await expect(page.locator(".ga-hero__number:visible")).toHaveText("24周+3天");
  await expect(
    page.getByText("还没有 B 超记录", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".ga-hero__number:visible")).toHaveText("24周+3天");
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cy:profile:v1") ?? "{}"),
  );
  expect(stored.basis.input).toEqual({
    method: "KNOWN_GA",
    date,
    weeks: 24,
    days: 3,
  });
  await page.getByText("更新孕期基准", { exact: true }).click();
  await tab(page, "已知孕周").click();
  await field(page, "该日孕周").fill("25");
  await save(page).click();
  await expect(page.getByText("更新孕期基准？", { exact: true })).toBeVisible();
  await page
    .locator(".uni-modal__btn")
    .filter({ hasText: /^取消$/ })
    .click();
  await expect(page).toHaveURL(/pages\/pregnancy\/edd/);
  const unchanged = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cy:profile:v1") ?? "{}"),
  );
  expect(unchanged.basis.input.weeks).toBe(24);
});

test("边界校验、42周提示与CRL单位切换不会输出虚假结果", async ({ page }) => {
  await enterKnownGestation(page, "24", "7");
  await expect(page.locator(".validation")).toContainText("0–6");
  await expect(save(page)).toHaveAttribute("disabled", "true");
  await field(page, "另加天数").fill("0");
  await field(page, "该日孕周").fill("42");
  await expect(page.locator(".warnings")).toContainText("42 周");
  await field(page, "该日孕周").fill("43");
  await expect(page.locator(".validation")).toContainText("0–42");
  await tab(page, "CRL").click();
  await field(page, "头臀径 CRL").fill("100");
  await expect(page.locator(".validation")).toContainText("15–95 mm");
  await tab(page, "厘米 cm").click();
  await expect(field(page, "头臀径 CRL")).toHaveValue("10");
  await field(page, "头臀径 CRL").fill("4.5");
  await expect(page.locator(".gestation")).toBeVisible();
  await expect(page.locator(".warnings")).toContainText("CRL 定年是统计估计");
  await tab(page, "毫米 mm").click();
  await expect(field(page, "头臀径 CRL")).toHaveValue("45");
});

test("设备存储写入失败时保留输入并显示可恢复错误", async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "cy:profile:v1")
        throw new DOMException("Storage quota exceeded", "QuotaExceededError");
      original.call(this, key, value);
    };
  });
  await enterKnownGestation(page);
  await save(page).click();
  await expect(page.locator(".field-error")).toContainText("保存失败");
  await expect(page).toHaveURL(/pages\/pregnancy\/edd/);
  await expect(field(page, "该日孕周")).toHaveValue("24");
  expect(
    await page.evaluate(() => localStorage.getItem("cy:profile:v1")),
  ).toBeNull();
});

test("主题与模式可保存，窄屏内容保持完整", async ({ page }) => {
  await page.goto("/#/pages/mine/index");
  await tab(page, "白话版").click();
  await page.getByRole("button", { name: /通用偏好/ }).click();
  await tab(page, "深色").click();
  await expect(page.locator(".ga-page")).toHaveClass(/ga-theme-dark/);
  await page.reload();
  await expect(page.locator(".ga-page")).toHaveClass(/ga-theme-dark/);
  await expect(page.locator(".ga-page")).toHaveClass(/ga-page--cozy/);
  await expect(tab(page, "CUHK 待核验")).toHaveAttribute("disabled", "true");
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
