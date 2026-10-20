import type { Page } from "@playwright/test";
export const fixtureAccount = {
  userId: "browser-fixture-uuid",
  accountStatus: "active",
  cloudDataEpoch: 1,
  cloudSyncEnabled: false,
  nickname: null,
  hasAvatar: false,
  profileRevision: 0,
};
/** 旧有医学/本机CRUD回归的账号边界替身；真实鉴权和资料落库由MySQL集成测试验证。 */
export async function installAccountFixture(page: Page, expiredAccess = false) {
  await page.addInitScript(
    ({ account, expired }) => {
      localStorage.setItem(
        "cy:account:v1",
        JSON.stringify({
          version: 1,
          account,
          tokens: {
            accessToken: "browser-test-access",
            refreshToken: "browser-test-refresh",
            tokenType: "Bearer",
            expiresIn: 900,
            refreshExpiresAt: "2099-01-01T00:00:00Z",
          },
          accessExpiresAt: expired ? 0 : 4070908800000,
        }),
      );
    },
    { account: fixtureAccount, expired: expiredAccess },
  );
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({ json: { code: "OK", data: fixtureAccount } }),
  );
}
