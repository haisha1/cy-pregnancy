import { chromium } from "@playwright/test";
import { parse } from "jsonc-parser";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { toolDefinitions } from "../data/tool-definitions.ts";
const routes = parse(readFileSync("pages.json", "utf8")).pages.map(
  (p) => "/" + p.path,
);
const extra = [
  ...toolDefinitions.map((t) => "/pages/tools/calculator?tool=" + t.key),
  "/pages/services/index?kind=ocr",
  "/pages/services/index?kind=ocr&stage=review",
  "/pages/services/index?kind=login",
  "/pages/knowledge/index?kind=treatment",
  "/pages/knowledge/index?kind=twins",
  "/pages/knowledge/detail?id=K01",
  "/pages/knowledge/detail?id=T01",
  "/pages/tools/organ?key=left-kidney-length",
  "/pages/tools/advanced?kind=twins",
];
const browser = await chromium.launch({ channel: "msedge" }),
  page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
  });
let route = "";
const errors = [],
  results = [];
page.on("pageerror", (e) => errors.push({ route, message: e.message }));
mkdirSync("artifacts/prd", { recursive: true });
for (const path of [...new Set([...routes, ...extra])]) {
  route = path;
  await page.goto("http://127.0.0.1:5173/#" + path);
  await page.reload();
  await page.locator(".ga-nav__title").waitFor();
  const size = await page.evaluate(() => ({
    width: innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  results.push({
    route,
    title: await page.locator(".ga-nav__title").textContent(),
    ...size,
  });
  if (
    [
      "/pages/mine/index",
      "/pages/timeline/index",
      "/pages/profile/manage",
      "/pages/tools/calculator?tool=cpr",
      "/pages/knowledge/detail?id=K01",
      "/pages/knowledge/index",
    ].includes(path)
  )
    await page.screenshot({
      path:
        "artifacts/prd/" +
        path
          .split("/")
          .pop()
          .replace(/[^a-z0-9-]/gi, "-") +
        ".png",
      fullPage: true,
    });
}
await page.setViewportSize({ width: 320, height: 740 });
await page.goto("http://127.0.0.1:5173/#/pages/tools/calculator?tool=ttts");
await page.locator(".ga-nav__title").waitFor();
results.push({
  route: "ttts-320",
  ...(await page.evaluate(() => ({
    width: innerWidth,
    content: document.documentElement.scrollWidth,
  }))),
});
writeFileSync(
  "artifacts/prd/smoke.json",
  JSON.stringify({ results, errors }, null, 2),
);
console.log(
  JSON.stringify(
    {
      pages: results.length,
      overflow: results.filter((r) => r.content > r.width),
      errors,
    },
    null,
    2,
  ),
);
await browser.close();
if (errors.length || results.some((r) => r.content > r.width))
  process.exitCode = 1;
