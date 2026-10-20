import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
let output;
try {
  output = execFileSync(
    process.execPath,
    [process.env.npm_execpath, "audit", "--json"],
    { encoding: "utf8" },
  );
} catch (error) {
  output = error.stdout;
}
if (!output) throw new Error("npm audit did not return a report");
const report = JSON.parse(output);
mkdirSync("artifacts", { recursive: true });
writeFileSync(
  "artifacts/dependency-audit.json",
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify(report.metadata?.vulnerabilities ?? report.error, null, 2),
);
process.exitCode = report.metadata?.vulnerabilities?.total ? 1 : 0;
