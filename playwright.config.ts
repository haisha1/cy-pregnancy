import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  use: {
    channel: "msedge",
    baseURL: "http://127.0.0.1:5173",
    viewport: { width: 390, height: 844 },
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev:h5",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
    timeout: 90_000,
  },
});
