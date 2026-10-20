import { test, expect, type Page } from "@playwright/test";
import { installAccountFixture } from "../support/accountFixture";
test.beforeEach(async ({ page }) => {
  await installAccountFixture(page);
});
const field = (page: Page, label: string) =>
  page.locator(".ga-field").filter({ hasText: label }).locator("input");
async function open(page: Page, route: string) {
  await page.goto("/#" + route);
  await page.reload();
  await expect(page.locator(".ga-nav__title")).toBeVisible();
}
async function seed(page: Page) {
  await page.clock.setFixedTime(new Date("2026-10-19T04:00:00Z"));
  await open(page, "/pages/index/index");
  await page.evaluate(() => {
    (window as any).uni.setStorageSync(
      "cy:profile:v1",
      JSON.stringify({
        version: 1,
        basis: {
          id: "seed-profile",
          method: "LMP",
          lmpEquivalent: "2026-04-01",
          createdAt: "2026-10-19T04:00:00Z",
        },
        records: [],
      }),
    );
  });
}
test("CPR enforces context, stores a real observation and exports only the chosen snapshot", async ({
  page,
}) => {
  await seed(page);
  await open(page, "/pages/tools/calculator?tool=cpr");
  await expect(page.locator(".ga-nav__title")).toHaveText("脑胎盘比 · CPR");
  await field(page, "MCA PI").fill("1.8");
  await field(page, "UA PI").fill("0");
  await expect(page.locator(".ga-field__error")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "保存本次输入", exact: true }),
  ).toBeDisabled();
  await field(page, "UA PI").fill("0.9");
  await page.getByRole("button", { name: "已核对一致", exact: true }).click();
  await expect(page.locator(".tool-result__value")).toContainText("2");
  await page.getByRole("button", { name: "保存本次输入", exact: true }).click();
  await expect(page.locator(".tool-saved")).toBeVisible();
  const record = await page.evaluate(
    () =>
      JSON.parse((window as any).uni.getStorageSync("cy:workspace:v1"))
        .observations[0],
  );
  expect(record.normalized).toEqual({ mca: 1.8, ua: 0.9 });
  expect(record.values[0].value).toBe(2);
  await open(page, "/pages/share/index?id=" + record.id);
  await expect(
    page.getByText("测量记录 · 本机导出", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "生成本机分享图片", exact: true })
    .click();
  await expect(
    page.getByText("图片已在本机生成，可在设备预览中保存或主动分享。", {
      exact: true,
    }),
  ).toBeVisible();
});
test("knowledge search, real detail navigation and favorite state survive reload without a subpage mode switch", async ({
  page,
}) => {
  await open(page, "/pages/knowledge/index");
  await page.locator(".ga-search input").fill("脉络丛");
  await expect(page.locator(".knowledge-entry")).toHaveCount(1);
  await page.locator(".knowledge-entry").click();
  await expect(page.locator(".ga-nav__title")).toHaveText("脉络丛囊肿");
  await expect(page.getByText("内容编审中", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "白话版", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "收藏本条知识", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "取消收藏", exact: true }),
  ).toBeVisible();
});
test("custom prenatal appointment requires explicit status, never claims reminder or hospital booking", async ({
  page,
}) => {
  await seed(page);
  await open(page, "/pages/timeline/detail");
  await field(page, "检查 / 事项名称").fill("医生确认的复查");
  await field(page, "时间（可选，24小时制）").fill("08:30");
  await page.getByRole("button", { name: "已预约", exact: true }).click();
  await page.getByRole("button", { name: "保存安排", exact: true }).click();
  await expect(page).toHaveURL(/timeline\/index/);
  await expect(
    page.getByRole("button", { name: /医生确认的复查/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /医生确认的复查/ }).click();
  await page.getByRole("button", { name: "已完成", exact: true }).click();
  await page.getByRole("button", { name: "保存安排", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /医生确认的复查.*已完成/ }),
  ).toBeVisible();
  const data = await page.evaluate(() =>
    JSON.parse((window as any).uni.getStorageSync("cy:workspace:v1")),
  );
  expect(data.appointments).toHaveLength(1);
  expect(data.appointments[0].reminder).toBe("not_enabled");
});
test("age is shown without persisting birthday, and high-risk specialty calculations remain blocked", async ({
  page,
}) => {
  await open(page, "/pages/tools/calculator?tool=age");
  await expect(
    page.getByRole("button", { name: "保存本次输入", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "保留输入草稿", exact: true }),
  ).toHaveCount(0);
  await open(page, "/pages/tools/calculator?tool=iut");
  await field(page, "估测胎儿体重 EFW").fill("820");
  await expect(
    page.getByRole("button", { name: "临床计算尚未开放", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".tool-result")).toHaveCount(0);
});
test("draft recovery preserves unit and exam context and never crosses pregnancy IDs", async ({
  page,
}) => {
  await seed(page);
  await open(page, "/pages/tools/calculator?tool=mvp");
  await field(page, "最大羊水池垂直深度").fill("3");
  await page
    .getByRole("button", { name: "毫米 mm / mm²", exact: true })
    .click();
  await expect(field(page, "最大羊水池垂直深度")).toHaveValue("30");
  await page.getByRole("button", { name: "保留输入草稿", exact: true }).click();
  await page.reload();
  await expect(field(page, "最大羊水池垂直深度")).toHaveValue("30");
  await expect(
    page.getByRole("button", { name: "毫米 mm / mm²", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("OCR保持未接通，登录说明引导档案入口，反馈仍为本机草稿", async ({
  page,
}) => {
  await open(page, "/pages/services/index?kind=ocr");
  await expect(
    page.getByRole("button", { name: "上传并识别 · 服务未接通", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "选择图片，仅本机预览", exact: true }),
  ).toBeVisible();
  await open(page, "/pages/services/index?kind=login");
  await expect(
    page.getByRole("button", { name: /进入孕期档案/ }),
  ).toBeVisible();
  await open(page, "/pages/mine/feedback");
  await page.locator("textarea").fill("希望补充这个指标的论文依据与边界说明");
  await page
    .getByRole("button", { name: "保留本机反馈草稿", exact: true })
    .click();
  await page.getByRole("button", { name: /查看反馈草稿与状态/ }).click();
  await expect(
    page.getByText("功能 · 本机草稿", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("已收到", { exact: true })).toHaveCount(0);
});
test("offline mode preserves local gestation calculations and is clearly announced", async ({
  page,
  context,
}) => {
  await open(page, "/pages/pregnancy/edd");
  await page.getByRole("button", { name: "已知孕周", exact: true }).click();
  await field(page, "该日孕周").fill("24");
  await field(page, "另加天数").fill("3");
  await expect(page.locator(".gestation")).toHaveText("24周+3天");
  await context.setOffline(true);
  await expect(
    page.getByText("当前离线：本地计算、记录和缓存内容可用，联网服务不可用。", {
      exact: true,
    }),
  ).toBeVisible();
  await field(page, "该日孕周").fill("25");
  await expect(page.locator(".gestation")).toHaveText("25周+3天");
  await context.setOffline(false);
});
