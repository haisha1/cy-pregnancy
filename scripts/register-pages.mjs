import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { parse, modify, applyEdits } from "jsonc-parser";
const source = readFileSync("pages.json", "utf8");
const config = parse(source);
for (const directory of readdirSync("pages", { withFileTypes: true }).filter(
  (entry) => entry.isDirectory(),
)) {
  for (const file of readdirSync("pages/" + directory.name)) {
    if (!file.endsWith(".vue")) continue;
    const path = "pages/" + directory.name + "/" + file.slice(0, -4);
    if (!config.pages.some((page) => page.path === path))
      config.pages.push({
        path,
        style: { navigationBarTitleText: "孕期超声工具" },
      });
  }
}
// 只更新pages数组，保留微信专属tabBar的条件编译标记，避免污染H5配置。
writeFileSync(
  "pages.json",
  applyEdits(
    source,
    modify(source, ["pages"], config.pages, {
      formattingOptions: { insertSpaces: true, tabSize: 2 },
    }),
  ),
);
