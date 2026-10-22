import { test } from "node:test";
import assert from "node:assert/strict";
import { validateCompanionResult } from "../src/companion/contract";
const result = () => ({
  version: "1.1.0",
  model: "Qwen3-VL 2B Instruct Q4_K_M",
  elapsedSeconds: 1,
  limitations: "Model-generated observations can be wrong.",
  observations: {
    image_description: "A cat rests on a blanket.",
    main_visible_objects: ["cat", "blanket"],
    scene_and_surroundings: null,
    notable_visual_details: ["The blanket is red."],
    uncertainties: [],
  },
});
test("companion accepts bounded serializable observations without changing analytics", () => {
  assert.deepEqual(validateCompanionResult(result()), result());
  const minimal = {
    ...result(),
    observations: {
      ...result().observations,
      main_visible_objects: [],
      notable_visual_details: [],
      uncertainties: [],
    },
  };
  assert.deepEqual(validateCompanionResult(minimal), minimal);
  assert.equal(
    validateCompanionResult({
      ...result(),
      observations: {
        ...result().observations,
        image_description: "x".repeat(2000),
        main_visible_objects: Array(40).fill("visible object"),
      },
    }).observations.image_description.length,
    2000,
  );
});
test("companion rejects malformed, truncated, oversized and extra model fields", () => {
  const invalid: unknown[] = [
    null,
    [],
    { ...result(), version: "2.0" },
    { ...result(), elapsedSeconds: NaN },
    { ...result(), elapsedSeconds: 186 },
    { ...result(), confidence: 99 },
    {
      ...result(),
      observations: { ...result().observations, image_description: "" },
    },
    {
      ...result(),
      observations: {
        ...result().observations,
        main_visible_objects: Array(41).fill("cat"),
      },
    },
    {
      ...result(),
      observations: {
        ...result().observations,
        image_description: "x".repeat(2001),
      },
    },
    {
      ...result(),
      observations: { ...result().observations, scene_and_surroundings: "" },
    },
    {
      ...result(),
      observations: { ...result().observations, scene_and_surroundings: [] },
    },
    {
      ...result(),
      observations: { ...result().observations, notable_visual_details: [123] },
    },
    {
      ...result(),
      observations: { ...result().observations, identity: "someone" },
    },
  ];
  for (const value of invalid)
    assert.throws(() => validateCompanionResult(value));
});
