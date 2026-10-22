import { test } from "node:test";
import assert from "node:assert/strict";
import { SCENE_LIBRARY, SCENE_LIBRARY_VERSION } from "../src/scene/candidates";
import { cosineScores, rankScenes, summarizeViews } from "../src/scene/ranking";
import { sceneViewPlan } from "../src/scene/coverage";
test("scene library is frozen, distinct and balanced without synonym ensembles", () => {
  assert.equal(SCENE_LIBRARY_VERSION, "ouahad-scenes-36-v1");
  assert.equal(SCENE_LIBRARY.length, 36);
  assert.equal(new Set(SCENE_LIBRARY.map((c) => c.id)).size, 36);
  assert.equal(new Set(SCENE_LIBRARY.map((c) => c.description)).size, 36);
  const counts = Object.values(
    SCENE_LIBRARY.reduce<Record<string, number>>((counts, c) => {
      counts[c.theme] = (counts[c.theme] ?? 0) + 1;
      return counts;
    }, {}),
  );
  assert.deepEqual(counts, [6, 6, 6, 6, 6, 6]);
  assert.equal(
    SCENE_LIBRARY.filter((c) => c.id === "outdoor-cooking").length,
    1,
  );
});
test("cosine uses vector norms, allows negatives and never normalizes to probabilities", () => {
  const texts = new Float32Array(36 * 2);
  for (let i = 0; i < 36; i++) {
    texts[i * 2] = i === 0 ? -3 : 3;
    texts[i * 2 + 1] = 4;
  }
  const scores = cosineScores([2, 0], texts, 2);
  assert.equal(scores[0], -0.6);
  assert.equal(scores[1], 0.6);
  assert.ok(scores.reduce((a, b) => a + b, 0) > 1);
  assert.throws(() => cosineScores([0, 0], texts, 2));
  assert.throws(() => rankScenes([NaN]));
});
test("whole image stays primary when crop views disagree; theme list is not a vote", () => {
  const whole = rankScenes(SCENE_LIBRARY.map((_, i) => (i === 0 ? 0.8 : 0.1)));
  const crop = rankScenes(SCENE_LIBRARY.map((_, i) => (i === 12 ? 0.9 : 0.1)));
  const result = summarizeViews([
    { name: "whole", region: null, ranking: whole },
    { name: "center", region: null, ranking: crop },
  ]);
  assert.equal(result.leading[0].id, "mountain-lake");
  assert.equal(result.viewAgreement, "different-leading-matches");
  assert.throws(() =>
    summarizeViews([{ name: "center", region: null, ranking: crop }]),
  );
});
test("crop plan retains whole view, records bounded regions and follows portrait direction", () => {
  assert.equal(sceneViewPlan(100, 300, "whole").length, 1);
  const views = sceneViewPlan(100, 300, "multi-crop");
  assert.deepEqual(
    views.map((v) => v.name),
    ["whole", "center", "top", "bottom"],
  );
  for (const v of views.slice(1)) {
    assert.ok(v.region!.x >= 0 && v.region!.y >= 0);
    assert.ok(v.region!.x + v.region!.width <= 100);
    assert.ok(v.region!.y + v.region!.height <= 300);
  }
});
