import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "jsonc-parser";
const rows = readFileSync("../../docs/prd/07-页面覆盖矩阵.md", "utf8")
  .split(/\r?\n/)
  .filter((line) => /^\|\s*S\d{2}(?:-[A-Za-z]+)?\s*\|/.test(line));
const mapping = [
  "index/index",
  "pregnancy/edd",
  "growth/biometry",
  "growth/chart",
  "profile/index",
  "index/all",
  "pregnancy/dates",
  "@ua",
  "@mca",
  "@dv",
  "@uta",
  "@cpr",
  "@nt",
  "@mvp",
  "@age",
  "timeline/index",
  "timeline/detail",
  "mine/index",
  "mine/preferences",
  "profile/manage",
  "profile/manage",
  "profile/detail",
  "profile/detail",
  "services/index?kind=sync",
  "services/index?kind=login",
  "knowledge/index",
  "knowledge/detail?id=K01",
  "tools/advanced?kind=twins",
  "@twin-growth",
  "@ttts",
  "@sfgr",
  "knowledge/index?kind=twins",
  "services/index?kind=ocr",
  "services/index?kind=ocr&stage=processing",
  "services/index?kind=ocr&stage=review",
  "tools/advanced",
  "@lhr",
  "@cvr",
  "@cvps",
  "knowledge/index?kind=treatment",
  "knowledge/detail?id=T01",
  "@iut",
  "share/index",
  "mine/data",
  "mine/about",
  "mine/feedback",
  "mine/feedback-history",
  "mine/references",
  "GaEmpty.vue",
  "GaPage.vue",
  "GaNotice.vue",
  "feedback.ts",
];
const gate = new Set([
    8, 9, 10, 11, 12, 13, 14, 15, 29, 30, 31, 36, 37, 38, 39, 42,
  ]),
  service = new Set([24, 25, 33, 34, 35, 46, 47]);
const registered = new Set(
  parse(readFileSync("pages.json", "utf8")).pages.map((p) => "/" + p.path),
);
const coverage = rows.map((line) => {
  const cells = line.split("|").map((s) => s.trim()),
    id = cells[1],
    number = Number(id.slice(1, 3));
  let route = id === "S14-AFI" ? "@afi" : mapping[number - 1];
  if (!route) throw Error("Missing mapping " + id);
  route =
    number >= 49
      ? (number === 52 ? "utils/" : "components/") + route
      : route.startsWith("@")
        ? "/pages/tools/calculator?tool=" + route.slice(1)
        : "/pages/" + route;
  if (route.startsWith("/") && !registered.has(route.split("?")[0]))
    throw Error("Unregistered route " + route);
  return {
    screenId: id,
    name: cells[2],
    figma: line.match(/https:\/\/www.figma.com\/design\/[^)]+/)?.[0],
    route,
    state:
      number >= 49
        ? "shared-state-component"
        : service.has(number)
          ? "frontend-service-unconnected"
          : gate.has(number)
            ? "input-and-reference-gate"
            : "offline-frontend",
  };
});
if (coverage.length !== 56)
  throw Error("Expected 56 functional types, got " + coverage.length);
writeFileSync(
  "../../docs/figma-build/implementation-20261019.json",
  JSON.stringify(
    {
      date: "2026-10-19",
      registeredRoutes: registered.size,
      functionalTypes: coverage.length,
      scope:
        "Frontend implementation and honest service/reference boundaries; not clinical approval or live backend verification.",
      coverage,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    routes: registered.size,
    functionalTypes: coverage.length,
    unregistered: 0,
  }),
);
