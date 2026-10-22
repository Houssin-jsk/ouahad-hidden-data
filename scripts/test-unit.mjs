// Production tests need no optional model downloads or unredistributed corpus.
// The full retained historical suite remains available, with assertions intact.
import { readdirSync } from "node:fs";
import { spawn } from "node:child_process";
const historical = new Set([
  "companion.test.ts",
  "evaluation.test.ts",
  "final-ai.test.ts",
  "phase03.test.ts",
  "readiness.test.ts",
  "scene.test.ts",
  "vision.test.ts",
]);
const all = process.argv.includes("--all");
const tests = readdirSync("tests")
  .filter((name) => name.endsWith(".test.ts") && (all || !historical.has(name)))
  .sort()
  .map((name) => "tests/" + name);
if (!all)
  console.log(
    "Production unit suite. Retained historical/model-fixture assertions: npm run test:all.",
  );
const child = spawn(
  process.execPath,
  ["node_modules/tsx/dist/cli.mjs", "--test", ...tests],
  { stdio: "inherit" },
);
child.on("error", () => {
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
