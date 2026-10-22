import { test } from "node:test";
import assert from "node:assert/strict";
import { researchAsset } from "../src/experiments/assets";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
test("research file handler denies all assets unless explicitly enabled and rejects traversal", async () => {
  const before = process.env.HIDDEN_DATA_BUILD_TARGET;
  const cwd = process.cwd();
  const root = await mkdtemp(path.join(tmpdir(), "hidden-data-assets-"));
  try {
    const directory = path.join(root, "research/assets/ai/mobilenetv4");
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, "config.json"),
      JSON.stringify({ id2label: { 0: "synthetic" } }),
    );
    process.chdir(root);
    process.env.HIDDEN_DATA_BUILD_TARGET = "release";
    assert.equal(
      (await researchAsset("ai", ["mobilenetv4", "config.json"])).status,
      404,
    );
    process.env.HIDDEN_DATA_BUILD_TARGET = "research";
    for (const parts of [
      ["..", "..", "package.json"],
      ["/package.json"],
      ["..%2fpackage.json"],
      [],
    ])
      assert.equal((await researchAsset("ai", parts)).status, 404);
    const response = await researchAsset("ai", ["mobilenetv4", "config.json"]);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.ok((await response.json()).id2label);
  } finally {
    process.chdir(cwd);
    await rm(root, { recursive: true, force: true });
    if (before === undefined) delete process.env.HIDDEN_DATA_BUILD_TARGET;
    else process.env.HIDDEN_DATA_BUILD_TARGET = before;
  }
});
