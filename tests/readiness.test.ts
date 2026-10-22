import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import benchmark from "./fixtures/readiness/benchmark.json";
import {
  AUDITED_SCENE_LIBRARY,
  AUDITED_LIBRARY_VERSION,
} from "../src/scene/audited-candidates";
import { SCENE_LIBRARY } from "../src/scene/candidates";
import { rankScenes, summarizeViews } from "../src/scene/ranking";

test("readiness dataset is fixed, diverse, disjoint from prior images and hash-verifiable", () => {
  assert.equal(benchmark.cases.length, 24);
  assert.equal(
    benchmark.cases.filter((c) => c.split === "held-out").length,
    12,
  );
  assert.equal(new Set(benchmark.cases.map((c) => c.sha256)).size, 24);
  for (const c of benchmark.cases) {
    assert.equal(
      createHash("sha256").update(readFileSync(c.file)).digest("hex"),
      c.sha256,
    );
    assert.ok(c.file.startsWith("tests/fixtures/readiness/"));
    for (const id of c.relevantAudited)
      assert.ok(AUDITED_SCENE_LIBRARY.some((item) => item.id === id));
  }
  assert.ok(benchmark.cases.some((c) => c.relevantAudited.length === 0));
});
test("audited descriptions remove unsupported qualifiers without changing baseline or candidate counts", () => {
  assert.equal(AUDITED_SCENE_LIBRARY.length, 36);
  assert.equal(
    SCENE_LIBRARY.find((c) => c.id === "living-room")!.description,
    "a furnished living room",
  );
  assert.equal(
    AUDITED_SCENE_LIBRARY.find((c) => c.id === "living-room")!.description,
    "a living room or sitting area",
  );
  assert.deepEqual(
    AUDITED_SCENE_LIBRARY.map((c) => c.id),
    SCENE_LIBRARY.map((c) => c.id),
  );
  const ranking = rankScenes(
    AUDITED_SCENE_LIBRARY.map((c) => (c.id === "living-room" ? 0.5 : 0.1)),
    AUDITED_SCENE_LIBRARY,
  );
  const summary = summarizeViews(
    [{ name: "whole", region: null, ranking }],
    AUDITED_LIBRARY_VERSION,
  );
  assert.equal(summary.libraryVersion, AUDITED_LIBRARY_VERSION);
  assert.equal(summary.leading[0].description, "a living room or sitting area");
  assert.ok(summary.leading.every((m) => !m.description.includes("furnished")));
});
