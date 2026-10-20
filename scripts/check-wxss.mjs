import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";

/** 检查真实编译产物，而非SCSS源码；H5条件编译中的通配符不会误报到微信平台。 */
export function checkSelectors(css, filename = "inline.wxss") {
  const errors = [];
  postcss.parse(css, { from: filename }).walkRules((rule) => {
    selectorParser((selectors) => {
      selectors.walkUniversals(() =>
        errors.push(
          `${filename}:${rule.source.start.line} 不支持通配选择器：${rule.selector}`,
        ),
      );
      // > :first-child 等省略了通配符的写法，也会被微信原生WXSS编译器拒绝。
      selectors.walkPseudos((pseudo) => {
        if (!/^:(first|last|nth|only)-(child|of-type)$/.test(pseudo.value))
          return;
        let previous = pseudo.prev();
        let anchored = false;
        while (previous && previous.type !== "combinator") {
          if (["class", "id", "tag", "attribute"].includes(previous.type))
            anchored = true;
          previous = previous.prev();
        }
        if (!anchored)
          errors.push(
            `${filename}:${rule.source.start.line} 不支持无元素限定的结构伪类：${rule.selector}`,
          );
      });
    }).processSync(rule.selector);
  });
  return errors;
}

export function checkDirectory(directory) {
  const files = [],
    errors = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name.endsWith(".wxss")) files.push(file);
    }
  }
  walk(directory);
  if (!files.length) throw new Error("未找到WXSS产物，请先构建微信小程序");
  for (const file of files)
    errors.push(...checkSelectors(fs.readFileSync(file, "utf8"), file));
  return { files: files.length, errors };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const directory = path.resolve(
    process.argv[2] || "unpackage/dist/build/mp-weixin",
  );
  const result = checkDirectory(directory);
  console.log(JSON.stringify({ directory, ...result }, null, 2));
  if (result.errors.length) process.exitCode = 1;
}
