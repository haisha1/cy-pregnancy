import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
// Retain HBuilderX's root source layout for both IDE and CLI builds.
const root = fileURLToPath(new URL("../", import.meta.url));
const child = spawn(
  process.execPath,
  [
    resolve(root, "node_modules/@dcloudio/vite-plugin-uni/bin/uni.js"),
    ...process.argv.slice(2),
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      UNI_INPUT_DIR: root,
      UNI_OUTPUT_DIR: resolve(
        root,
        "unpackage",
        process.argv.includes("build") ? "dist/build" : "dist/dev",
        process.argv.includes("mp-weixin") ? "mp-weixin" : "h5",
      ),
    },
  },
);
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
