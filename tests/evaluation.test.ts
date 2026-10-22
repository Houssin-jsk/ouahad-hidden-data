import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fullFrameSize,
  normalizeDetections,
} from "../src/experiments/vision/geometry";
import { SCENE_CANDIDATES } from "../src/experiments/vision/types";
test("experimental detector retains complete aspect ratio within a pixel bound", () => {
  assert.deepEqual(fullFrameSize(2592, 1944), { width: 682, height: 512 });
  assert.deepEqual(fullFrameSize(40, 20), { width: 1024, height: 512 });
  assert.deepEqual(fullFrameSize(2000, 100), { width: 1333, height: 66 });
  assert.throws(() => fullFrameSize(0, 20));
});
test("normalized spatial overlays clamp boundaries and reject invalid model boxes", () => {
  const detections = normalizeDetections([
    {
      label: "cat",
      score: 0.7,
      box: { xmin: -0.01, ymin: 0.1, xmax: 1.1, ymax: 0.9 },
    },
    {
      label: "invalid",
      score: NaN,
      box: { xmin: 0, ymin: 0, xmax: 1, ymax: 1 },
    },
    {
      label: "inverted",
      score: 0.5,
      box: { xmin: 0.8, ymin: 0, xmax: 0.2, ymax: 1 },
    },
  ]);
  assert.equal(detections.length, 1);
  assert.deepEqual(detections[0].box, {
    xmin: 0,
    ymin: 0.1,
    xmax: 1,
    ymax: 0.9,
  });
});
test("semantic candidate set includes counterexamples and does not inject a Moroccan identity", () => {
  assert.equal(SCENE_CANDIDATES.length, 10);
  assert.ok(SCENE_CANDIDATES.includes("outdoor cooking with pots over a fire"));
  assert.ok(SCENE_CANDIDATES.includes("a radio telescope"));
  assert.ok(!SCENE_CANDIDATES.some((label) => /morocc|tagine/i.test(label)));
});
