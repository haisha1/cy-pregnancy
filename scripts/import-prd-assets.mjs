import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  statSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
const assets = {};
for (const [theme, name] of [
  ["light", "S18"],
  ["dark", "S18-dark"],
]) {
  const text = readFileSync(
    "../../docs/figma-build/prd-" + name + ".txt",
    "utf8",
  );
  const prefix = text.match(/const assetPathPrefix = "([^"]+)"/)[1];
  assets[theme] = {};
  mkdirSync("static/figma/" + theme, { recursive: true });
  for (const [, key, file] of text.matchAll(
    /const (img\w+) = `\$\{assetPathPrefix\}\/([^`]+)`/g,
  )) {
    const path = "static/figma/" + theme + "/" + file;
    if (!existsSync(path) || !statSync(path).size)
      execFileSync("curl.exe", ["-fsSL", prefix + "/" + file, "-o", path]);
    assets[theme][key] = "/" + path;
  }
}
writeFileSync("data/prd-assets.json", JSON.stringify(assets, null, 2) + "\n");
