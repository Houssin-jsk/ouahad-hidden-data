// Run before inference. Labels follow visual inspection of corpus-contact.png.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
const { records } = JSON.parse(
  await readFile("tests/fixtures/phase03/sources.json", "utf8"),
);
const labels = [
  ["Snowy forest path", ["forest"], []],
  ["Snowy mountains and lake, small hikers", ["mountain-lake"], [970]],
  ["Beach and coastal cliff", ["coast"], [978]],
  [
    "City street with tram, cars and pedestrians",
    ["railway", "road-vehicles", "street-people", "architecture"],
    [829],
  ],
  ["Historic furnished sitting room", ["living-room"], []],
  ["Plated meal, potatoes and green beans", ["meal"], [923, 935]],
  ["Domestic cat on carpet", ["pets"], [281, 282, 283, 284, 285]],
  ["Elephant with human feeding it outdoors", ["wildlife"], [386]],
  ["Human face close-up; no identity inference", [], []],
  ["Flower close-up, not a gardening activity", [], []],
  ["Airplane against sky", [], [404]],
  ["Clock tower facade", ["architecture"], [409, 892]],
  ["Soap bubble macro; not glass objects", [], [971]],
  ["Teapots displayed in shop", ["pottery"], [849]],
  ["Antique double-neck acoustic guitar", ["music"], [402]],
  ["People playing football", ["sport"], [805]],
];
const cases = records.map((r, i) => ({
  ...r,
  annotationStatus: "visually-inspected-before-inference",
  observation: labels[i][0],
  sceneIds: labels[i][1],
  imageNetIds: labels[i][2],
}));
const recipes = [
  ["low-light", 1, { brightness: 0.22 }],
  ["low-contrast", 3, null],
  ["blur", 7, null],
  ["crop-occlusion", 15, null],
];
for (const [name, index, options] of recipes) {
  const parent = cases[index];
  let image = sharp(parent.file);
  if (name === "low-light") image = image.modulate(options);
  if (name === "low-contrast") image = image.linear(0.25, 96);
  if (name === "blur") image = image.blur(12);
  if (name === "crop-occlusion") {
    const { width, height } = await image.metadata();
    const w = Math.floor(width * 0.7),
      h = Math.floor(height * 0.7);
    image = image
      .extract({
        left: Math.floor(width * 0.15),
        top: Math.floor(height * 0.15),
        width: w,
        height: h,
      })
      .composite([
        {
          input: {
            create: {
              width: Math.floor(w * 0.25),
              height: h,
              channels: 3,
              background: "#777",
            },
          },
          left: 0,
          top: 0,
        },
      ]);
  }
  const file = `tests/fixtures/phase03/${parent.id}-${name}.jpg`;
  const buffer = await image.jpeg({ quality: 90 }).toBuffer();
  await writeFile(file, buffer);
  cases.push({
    ...parent,
    id: `${parent.id}-${name}`,
    file,
    parentId: parent.id,
    split: "test-transform",
    recipe: name,
    bytes: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    annotationStatus: "parent-label-retained-for-stability-only",
  });
}
await writeFile(
  "tests/fixtures/phase03/benchmark.json",
  JSON.stringify(
    {
      version: "phase03-natural-v1",
      frozenBeforeInference: true,
      task: "Rank frozen audited 36 supplied descriptions; abstain when none adequately describes principal content. No generated caption.",
      selectionEvidence:
        "Historical models and 12 licensed historical development images informed candidate selection only. New fixed-query originals have never been inferred before annotation.",
      annotationPolicy:
        "Single visual evaluator, set-valued scene relevance. First accepted ID is primary descriptive class, not an exclusive truth. ImageNet IDs denote acceptable visible object families/content only; no scene accuracy is attributed to ImageNet. Empty lists mean no suitable principal-content label. Related transformations stay with test parent, evaluated for stability separately.",
      gates: {
        coveredTop1: 0.8,
        coveredTop4: 0.9,
        acceptedPrecision: 0.9,
        coveredCoverage: 0.5,
        unsupportedFalseAccepts: 0,
      },
      calibration:
        "Only calibration originals: search top cosine threshold and first-second margin; require zero unsupported acceptances and precision >= .9; maximize correct accepted count, then minimize wrong accepted count, then prefer higher score threshold and margin. Test originals evaluated once with frozen thresholds. Accept-none is valid abstention but fails coverage.",
      limitations:
        "16 natural originals (8 calibration, 8 test) plus 4 related transformations; convenience search sample, one annotator, sparse classes, only one independent unsupported test original. Not population accuracy, probability calibration or class certification.",
      cases,
    },
    null,
    2,
  ) + "\n",
);
