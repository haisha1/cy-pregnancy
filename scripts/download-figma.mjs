import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
const root = resolve(import.meta.dirname, "..");
const manifest = {};
for (const [theme, name] of [
  ["light", "home"],
  ["dark", "home-dark"],
]) {
  const source = readFileSync(
    resolve(root, "../../docs/figma-build/context-" + name + ".txt"),
    "utf8",
  );
  const prefix = source.match(/const assetPathPrefix = "([^"]+)"/)[1];
  mkdirSync(resolve(root, "static/figma", theme), { recursive: true });
  manifest[theme] = {};
  for (const match of source.matchAll(
    /const (img\w+) = `\$\{assetPathPrefix\}\/([^`]+)`/g,
  )) {
    const target = resolve(root, "static/figma", theme, match[2]);
    execFileSync("curl.exe", ["-fsSL", prefix + "/" + match[2], "-o", target]);
    manifest[theme][match[1]] = "/static/figma/" + theme + "/" + match[2];
  }
}
writeFileSync(
  resolve(root, "data/figma-assets.json"),
  JSON.stringify(manifest, null, 2),
);
