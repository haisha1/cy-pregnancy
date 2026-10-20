import { expect, test, type Page } from "@playwright/test";
import { installAccountFixture } from "../support/accountFixture";
test.beforeEach(async ({ page }) => {
  await installAccountFixture(page);
});

type BrowserUni = {
  setStorageSync: (key: string, value: string) => void;
  getStorageSync: (key: string) => string;
};
type StoredProfile = {
  records: {
    id: string;
    date: string;
    gaDays: number;
    efwGrams: number | null;
    measurements: Record<string, number>;
  }[];
};

const input = (page: Page, metric: string) =>
  page.locator(`#measure-${metric.toLowerCase()} input`);

async function installEmptyPregnancy(page: Page) {
  await page.clock.setFixedTime(new Date("2026-10-18T10:00:00+08:00"));
  await page.goto("/#/pages/index/index");
  await expect(page.locator(".ga-page")).toBeVisible();
  await page.evaluate(() => {
    const api = (window as unknown as { uni: BrowserUni }).uni;
    api.setStorageSync(
      "cy:profile:v1",
      JSON.stringify({
        version: 1,
        basis: {
          id: "growth-e2e-basis",
          method: "LMP",
          lmpEquivalent: "2026-04-01",
          createdAt: "2026-10-18T02:00:00.000Z",
        },
        records: [],
      }),
    );
  });
  await page.goto("/#/pages/growth/biometry");
  await page.reload();
  await expect(page.locator(".measurement-context__gestation")).toHaveText(
    "孕 28周+4天",
  );
}

async function readProfile(page: Page): Promise<StoredProfile> {
  return page.evaluate(
    () =>
      JSON.parse(
        (window as unknown as { uni: BrowserUni }).uni.getStorageSync(
          "cy:profile:v1",
        ),
      ) as StoredProfile,
  );
}

test("empty growth page contains no invented measurements or clinical classifications", async ({
  page,
}) => {
  await page.goto("/#/pages/growth/biometry");
  await expect(input(page, "BPD")).toHaveValue("");
  await expect(input(page, "HC")).toHaveValue("");
  await expect(input(page, "EFW")).toHaveValue("");
  await expect(page.getByText("还没有测量点", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "保存本次测量", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "CUHK · 待开放", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".ga-measure-row__assessment")).toHaveCount(6);
  await expect(page.locator(".ga-result-chart__notice")).toContainText(
    "参考曲线待核验",
  );
  await expect(page.getByText(/P58|P2\.8|Z \+0\.20|参考区间正常/)).toHaveCount(
    0,
  );
  await page.goto("/#/pages/mine/index");
  await page.getByRole("button", { name: "白话版", exact: true }).click();
  await page.goto("/#/pages/growth/biometry");
  await expect(page.getByText("要不要紧", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      "参考曲线还在核验中，这里暂时不能判断宝宝偏大、偏小或是否正常。一次测量也不能代替连续观察。",
      { exact: true },
    ),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});

test("four measurements convert units and persist, same-day sessions coexist and selected revisions require confirmation", async ({
  page,
}) => {
  await installEmptyPregnancy(page);
  await input(page, "BPD").fill("7.9");
  await input(page, "HC").fill("28.6");
  await input(page, "AC").fill("26.3");
  await input(page, "FL").fill("5.2");
  await expect(input(page, "EFW")).toHaveValue("1450");
  const changeBpdUnit = page.getByRole("button", {
    name: "双顶径当前单位cm，点击切换为mm",
    exact: true,
  });
  await changeBpdUnit.focus();
  await changeBpdUnit.press("Enter");
  await expect(input(page, "BPD")).toHaveValue("79");
  await expect(input(page, "EFW")).toHaveValue("1450");
  await page.getByRole("button", { name: "保存本次测量", exact: true }).click();
  await expect(
    page.getByText("已保存到我的档案，记录保存在本机。", { exact: true }),
  ).toBeVisible();
  let profile = await readProfile(page);
  expect(profile.records).toHaveLength(1);
  expect(profile.records[0].gaDays).toBe(200);
  expect(profile.records[0].measurements).toEqual({
    BPD: 7.9,
    HC: 28.6,
    AC: 26.3,
    FL: 5.2,
  });
  expect(profile.records[0].efwGrams).toBeCloseTo(1450.1272044307605, 6);

  await input(page, "FL").fill("5.3");
  await page.getByRole("button", { name: "保存本次测量", exact: true }).click();
  await expect
    .poll(async () => (await readProfile(page)).records.length)
    .toBe(2);
  expect(
    (await readProfile(page)).records.map((r) => r.measurements.FL).sort(),
  ).toEqual([5.2, 5.3]);

  profile = await readProfile(page);
  const selected = profile.records.find((r) => r.measurements.FL === 5.3)!;
  await page.goto(
    `/#/pages/growth/biometry?sessionId=${encodeURIComponent(selected.id)}`,
  );
  await page.reload();
  await expect(input(page, "BPD")).toHaveValue("7.9");
  await expect(input(page, "FL")).toHaveValue("5.3");
  await expect(page.locator(".measurement-context__gestation")).toHaveText(
    "孕 28周+4天",
  );
  await page.goto("/#/pages/growth/chart?metric=HC");
  await expect(page.locator(".chart-session")).toHaveCount(2);
  await expect(page.locator(".chart-session__value").first()).toContainText(
    "28.6",
  );
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "FL", exact: true }).click();
  await expect(
    page.locator(".chart-session__value").filter({ hasText: "5.3" }),
  ).toHaveCount(1);
  await expect(page.locator(".ga-result-chart__title")).toHaveText(
    "股骨长 FL（cm）",
  );
  await page.getByRole("button", { name: "HC", exact: true }).click();
  await page.getByRole("button", { name: "生成曲线图片", exact: true }).click();
  await expect(
    page.getByText("曲线图片已生成", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator(".chart-share__image img")).toHaveAttribute(
    "src",
    /^data:image\/png/,
  );
});

test("invalid measurement preserves entry, prevents save, and remains legible in dark theme", async ({
  page,
}) => {
  await installEmptyPregnancy(page);
  await input(page, "HC").fill("286");
  await expect(input(page, "HC")).toHaveValue("286");
  await expect(page.locator("#measure-hc-error")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "保存本次测量", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "头围当前单位cm，点击切换为mm", exact: true })
    .click();
  await expect(input(page, "HC")).toHaveValue("2860");
  await expect(page.locator("#measure-hc-error")).toBeVisible();
  await input(page, "HC").fill("286");
  await expect(page.locator("#measure-hc-error")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "保存本次测量", exact: true }),
  ).toBeEnabled();
  await page.evaluate(() =>
    (window as unknown as { uni: BrowserUni }).uni.setStorageSync(
      "cy:app:v1",
      JSON.stringify({ theme: "dark", mode: "pro", standard: "INTERGROWTH" }),
    ),
  );
  await page.reload();
  await expect(page.locator(".ga-theme-dark")).toBeVisible();
  await expect(page.locator(".ga-result-chart__notice")).toContainText(
    "参考曲线待核验",
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});
