import { test, expect } from "@playwright/test";
import { installAccountFixture } from "../support/accountFixture";
test("游客启动无登录请求，进入档案才提示，可返回继续使用", async ({ page }) => {
  const calls: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/v1/")) calls.push(req.url());
  });
  await page.goto("/#/pages/index/index");
  await expect(page.locator(".ga-nav__title")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "微信登录", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "我的", exact: true }).click();
  await expect(page.getByText(/游客使用/)).toBeVisible();
  expect(calls).toEqual([]);
  await page.getByRole("button", { name: "档案", exact: true }).click();
  await expect(
    page.getByText("登录后查看孕期档案", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("管理我的孕期档案", { exact: true })).toHaveCount(
    0,
  );
  expect(calls).toEqual([]);
  await page.getByRole("button", { name: "继续游客使用", exact: true }).click();
  await expect(page.getByText("从了解孕周开始", { exact: true })).toBeVisible();
  expect(calls).toEqual([]);
});
test("真实服务未配置微信时清晰提示，工具不受影响，深链也保护档案", async ({
  page,
}) => {
  await page.goto("/#/pages/profile/detail");
  await expect(
    page.getByText("登录后查看孕期档案", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "微信登录", exact: true }).click();
  await expect(page.getByText(/微信登录尚未配置/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "微信登录", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "继续游客使用", exact: true }).click();
  await expect(page.getByText("从了解孕周开始", { exact: true })).toBeVisible();
});
test("已登录账号档案可见，退出清凭据并返回游客，健康数据保留", async ({
  page,
}) => {
  await installAccountFixture(page);
  await page.route("**/api/v1/auth/logout", (route) =>
    route.fulfill({ json: { code: "OK", data: null } }),
  );
  await page.goto("/#/pages/profile/index");
  await expect(
    page.getByText("完善头像与昵称（选填）", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    localStorage.setItem("cy:profile:sentinel", "local-health-preserved"),
  );
  await page.getByText("完善头像与昵称（选填）", { exact: true }).click();
  await expect(page.locator("#account-nickname input")).toBeVisible();
  await page.locator("#account-nickname input").fill("尚未保存的昵称");
  await page.getByRole("button", { name: "重新加载资料", exact: true }).click();
  await expect(
    page.getByText("放弃未保存的头像昵称？", { exact: true }),
  ).toBeVisible();
  await page
    .locator(".uni-modal__btn")
    .filter({ hasText: /^取消$/ })
    .click();
  await expect(page.locator("#account-nickname input")).toHaveValue(
    "尚未保存的昵称",
  );
  await page
    .getByRole("button", { name: "退出登录，返回游客", exact: true })
    .click();
  await page
    .locator(".uni-modal__btn")
    .filter({ hasText: /^确认$/ })
    .click();
  await expect(
    page.getByText("登录后查看孕期档案", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("cy:account:v1")),
  ).toBeNull();
  expect(
    await page.evaluate(() => localStorage.getItem("cy:profile:sentinel")),
  ).toBe("local-health-preserved");
});
test("会话失效回到游客，仅档案显示登录提示", async ({ page }) => {
  await installAccountFixture(page);
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({
      status: 401,
      json: { code: "AUTH_EXPIRED", message: "会话无效" },
    }),
  );
  await page.route("**/api/v1/auth/refresh", (route) =>
    route.fulfill({
      status: 401,
      json: { code: "AUTH_EXPIRED", message: "请重新登录" },
    }),
  );
  await page.goto("/#/pages/profile/index");
  await expect(
    page.getByText("登录后查看孕期档案", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "工具", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "微信登录", exact: true }),
  ).toHaveCount(0);
});
test("微信资料检查失败保留账号，服务异常可恢复且窄屏不溢出", async ({
  page,
}) => {
  await installAccountFixture(page);
  let failed = true;
  await page.route("**/api/v1/me", (route) =>
    route.fulfill(
      failed
        ? {
            status: 503,
            json: { code: "UNAVAILABLE", message: "服务暂不可用" },
          }
        : {
            json: {
              code: "OK",
              data: {
                userId: "fixture",
                accountStatus: "active",
                profileRevision: 0,
                hasAvatar: false,
                nickname: null,
              },
            },
          },
    ),
  );
  await page.goto("/#/pages/profile/index");
  await expect(page.getByText("服务暂不可用", { exact: true })).toBeVisible();
  failed = false;
  await page.getByRole("button", { name: "重新加载档案", exact: true }).click();
  await expect(
    page.getByText("完善头像与昵称（选填）", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
