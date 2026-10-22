import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const checker = path.resolve("scripts/check-production-types.mjs");
test("release graph excludes historical roots but rejects ignored imports even when tsconfig excludes them", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "hidden-data-build-"));
  try {
    await mkdir(path.join(directory, "src/app"), { recursive: true });
    await mkdir(path.join(directory, "src/companion"), { recursive: true });
    await mkdir(path.join(directory, "research"), { recursive: true });
    await writeFile(
      path.join(directory, "tsconfig.production.json"),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noEmit: true,
          resolveJsonModule: true,
          module: "esnext",
          moduleResolution: "bundler",
        },
        include: ["src/app/**/*.ts"],
        exclude: ["src/companion"],
      }),
    );
    await writeFile(
      path.join(directory, ".vercelignore"),
      "companion/\nresearch/\n",
    );
    await writeFile(
      path.join(directory, "research/config.json"),
      '{"label": "fixture"}',
    );
    await writeFile(
      path.join(directory, "src/companion/contract.ts"),
      "export interface Historical { value: string }\n",
    );
    const entry = path.join(directory, "src/app/page.ts");
    await writeFile(entry, "export const production = true;\n");
    const run = () =>
      spawnSync(process.execPath, [checker], {
        cwd: directory,
        encoding: "utf8",
      });
    const good = run();
    assert.equal(good.status, 0, good.stderr);
    // A type-only relative import bypasses include/exclude but must fail the gate.
    await writeFile(
      entry,
      "import type { Historical } from '../companion/contract'; export type Result = Historical;\n",
    );
    const bad = run();
    assert.notEqual(bad.status, 0);
    assert.match(bad.stderr, /Production TypeScript imports files excluded/);
    assert.match(bad.stderr, /src\/companion\/contract\.ts/);
    await writeFile(
      entry,
      "import config from '../../research/config.json'; export const label = config.label;\n",
    );
    const jsonImport = run();
    assert.notEqual(jsonImport.status, 0);
    assert.match(jsonImport.stderr, /research\/config\.json/);
  } finally {
    assert(
      path
        .resolve(directory)
        .startsWith(path.resolve(tmpdir()) + path.sep + "hidden-data-build-"),
    );
    await rm(directory, { recursive: true });
  }
});
test("production config inherits strictness and checks both route and native-pixel worker entrypoints", async () => {
  const full = JSON.parse(await readFile("tsconfig.json", "utf8"));
  const production = JSON.parse(
    await readFile("tsconfig.production.json", "utf8"),
  );
  assert.equal(full.compilerOptions.strict, true);
  assert.equal(production.extends, "./tsconfig.json");
  assert.equal(production.compilerOptions.strict, undefined);
  assert(production.include.includes("src/analysis/analysis.worker.ts"));
  const result = spawnSync(process.execPath, [checker], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});
