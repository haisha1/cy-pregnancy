import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  locale: "zh-CN",
  timezoneId: "Asia/Shanghai",
});
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
mkdirSync("artifacts", { recursive: true });
for (const [name, route] of [
  ["home", "index/index"],
  ["edd", "pregnancy/edd"],
  ["growth", "growth/biometry"],
  ["chart", "growth/chart"],
  ["records", "profile/index"],
  ["mine", "mine/index"],
]) {
  await page.goto("http://127.0.0.1:5173/#/pages/" + route);
  await page.locator(".ga-nav__title").waitFor();
  await page.screenshot({
    path: `artifacts/${name}-light.png`,
    fullPage: true,
  });
  const size = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  console.log(name, size);
}
await page.getByRole("button", { name: /通用偏好/ }).click();
await page.getByRole("button", { name: "深色", exact: true }).click();
await page.goto("http://127.0.0.1:5173/#/pages/mine/index");
await page.screenshot({ path: "artifacts/mine-dark.png", fullPage: true });
await page.getByRole("button", { name: "工具", exact: true }).click();
await page.screenshot({ path: "artifacts/home-dark.png", fullPage: true });
// Test-only sample data stays in this isolated browser context, never in application defaults.
await page.clock.setFixedTime(new Date("2026-10-18T04:00:00Z"));
await page.evaluate(() => {
  window.uni.setStorageSync(
    "cy:app:v1",
    JSON.stringify({ theme: "light", mode: "pro", standard: "INTERGROWTH" }),
  );
  window.uni.setStorageSync(
    "cy:profile:v1",
    JSON.stringify({
      version: 1,
      basis: {
        id: "preview-only",
        method: "LMP",
        lmpEquivalent: "2026-04-30",
        createdAt: "2026-10-18T04:00:00Z",
      },
      records: [
        {
          id: "preview-1",
          profileId: "preview-only",
          date: "2026-09-18",
          gaDays: 141,
          standard: "INTERGROWTH",
          measurements: { BPD: 5.4, HC: 19.5, AC: 17.2, FL: 3.6 },
          efwGrams: null,
          formulaVersion: "",
          referenceVersion: "preview-only",
        },
        {
          id: "preview-2",
          profileId: "preview-only",
          date: "2026-10-18",
          gaDays: 171,
          standard: "INTERGROWTH",
          measurements: { BPD: 6.2, HC: 23.2, AC: 20.1, FL: 4.4 },
          efwGrams: null,
          formulaVersion: "",
          referenceVersion: "preview-only",
        },
      ],
    }),
  );
});
for (const [name, route] of [
  ["home-populated", "index/index"],
  ["records-populated", "profile/index"],
  ["chart-populated", "growth/chart"],
]) {
  await page.goto("http://127.0.0.1:5173/#/pages/" + route);
  await page.reload();
  await page.locator(".ga-nav__title").waitFor();
  if (name === "chart-populated") await page.locator("canvas").waitFor();
  await page.screenshot({ path: `artifacts/${name}.png`, fullPage: true });
}
console.log("Runtime errors:", errors);
await browser.close();
