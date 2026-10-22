import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import benchmark from "./fixtures/phase03/benchmark.json";
import {
  accepts,
  calibrate,
  quality,
  type QualityRow,
} from "../src/experiments/vision/quality";
test("frozen licensed corpus checksums and parent splits stay independent", async () => {
  const ids = new Set<string>();
  for (const fixture of benchmark.cases) {
    assert.equal(ids.has(fixture.id), false);
    ids.add(fixture.id);
    assert.match(fixture.license, /^(CC0|CC BY|Public domain)/);
    assert.equal(
      createHash("sha256")
        .update(await readFile(fixture.file))
        .digest("hex"),
      fixture.sha256,
    );
    if ("parentId" in fixture) {
      assert.equal(fixture.split, "test-transform");
      assert.equal(
        benchmark.cases.find((p) => p.id === fixture.parentId)?.split,
        "test",
      );
    }
  }
  assert.equal(
    benchmark.cases.filter((c) => c.split === "calibration").length,
    8,
  );
  assert.equal(benchmark.cases.filter((c) => c.split === "test").length, 8);
});
const rows: QualityRow[] = [
  {
    id: "correct",
    acceptedIds: ["a"],
    ranking: [
      { id: "a", score: 0.8 },
      { id: "b", score: 0.2 },
    ],
  },
  {
    id: "wrong",
    acceptedIds: ["b"],
    ranking: [
      { id: "a", score: 0.4 },
      { id: "b", score: 0.3 },
    ],
  },
  {
    id: "outside",
    acceptedIds: [],
    ranking: [
      { id: "a", score: 0.5 },
      { id: "b", score: 0.45 },
    ],
  },
];
test("quality separates relevance, accepted precision, coverage and unsupported failures", () => {
  const q = quality(rows, { minimumScore: 0, minimumMargin: 0 });
  assert.equal(q.coveredTop1, 0.5);
  assert.equal(q.coveredTop4, 1);
  assert.equal(q.acceptedPrecision, 1 / 3);
  assert.equal(q.coveredCoverage, 1);
  assert.equal(q.unsupportedAccepted, 1);
  assert.deepEqual(q.confusion, {
    a: { a: 1 },
    b: { a: 1 },
    unsupported: { a: 1 },
  });
});
test("calibration abstains on unsafe rows and does not receive test labels", () => {
  const policy = calibrate(rows);
  assert.equal(accepts(rows[0], policy), true);
  assert.equal(accepts(rows[1], policy), false);
  assert.equal(accepts(rows[2], policy), false);
  assert.equal(quality(rows, policy).coveredCoverage, 0.5);
});
test("reject-all has undefined precision and zero coverage, never a perfect score", () => {
  const q = quality(rows, { minimumScore: 2, minimumMargin: 2 });
  assert.equal(q.acceptedPrecision, null);
  assert.equal(q.coveredCoverage, 0);
  assert.equal(q.abstained, 3);
  assert.equal(
    accepts(
      {
        ...rows[0],
        ranking: [
          { id: "a", score: NaN },
          { id: "b", score: 0 },
        ],
      },
      { minimumScore: 0, minimumMargin: 0 },
    ),
    false,
  );
});
