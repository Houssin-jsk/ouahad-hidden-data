/** Dataset selection is independent of inference: first 16 published COCO rows,
 * plus eight frozen photographs filling domain gaps. Never selects by CLIP score. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const dir = "tests/fixtures/readiness";
await mkdir(dir, { recursive: true });
// Once selected, reproduce the byte-identical manifest, never reselect subjects.
let frozen;
try {
  frozen = JSON.parse(await readFile(`${dir}/benchmark.json`, "utf8"));
} catch {}
if (frozen) {
  for (const c of frozen.cases) {
    const saved = await save(c.file, c.downloadUrl ?? c.originalUrl);
    if (saved.sha256 !== c.sha256)
      throw Error(
        `Fixture changed: ${c.id}. Restore the pinned bytes; do not update judgments automatically.`,
      );
  }
  console.log(`Verified ${frozen.cases.length} frozen photographs.`);
  process.exit(0);
}
const rowsUrl =
  "https://datasets-server.huggingface.co/first-rows?dataset=detection-datasets/coco&config=default&split=train";
const response = await fetch(rowsUrl);
if (!response.ok) throw Error(`Dataset metadata HTTP ${response.status}`);
const data = await response.json();
const ids = [9, 25, 30, 34, 36, 42, 49, 61, 64, 71, 72, 73, 74, 77, 78, 81];
const judgments = [
  ["meal", ["meal"]],
  ["giraffes among trees", ["wildlife"]],
  ["flower arrangement in a vase", []],
  ["zebra grazing", ["wildlife"]],
  ["portrait with parasol; setting not established", []],
  ["cat on a shoe rack", ["pets"]],
  ["people playing frisbee", ["sport"]],
  ["elephants and people amid forest vegetation", ["wildlife", "forest"]],
  ["public clock with street background; no clock candidate", []],
  ["passenger train and railway", ["railway"]],
  ["giraffes among trees", ["wildlife"]],
  ["parked motorcycles", ["road-vehicles"]],
  ["dog lying in a street", []],
  ["skateboarders at a skate park", ["sport"]],
  ["ornamental clock and vase", []],
  ["airplane in flight", []],
];
const commons = [
  [
    "forest",
    "Landscape of a wild forest.jpg",
    "sunlit trees and undergrowth",
    ["forest"],
    ["forest"],
  ],
  [
    "kitchen",
    "Kitchen interior design.jpg",
    "kitchen interior without visible food preparation",
    [],
    [],
  ],
  [
    "potter",
    "Tajine potter.jpg",
    "Moroccan potter working among clay pots",
    ["pottery"],
    ["pottery"],
  ],
  [
    "teapots",
    "Moroccan Teapots.jpg",
    "metal teapots displayed in a shop",
    ["pottery"],
    ["pottery", "drinks"],
  ],
  [
    "bubbles",
    "Indigo bubbles.jpg",
    "abstract soap-bubble pattern; no adequate bubble description",
    [],
    [],
  ],
  ["flower", "Flower in macro.jpg", "macro photograph of a flower", [], []],
  [
    "tajine",
    "Moroccan tajine.jpg",
    "cooked tajine meal served in a pot",
    ["meal"],
    ["meal"],
  ],
  [
    "coast",
    "Beach Landscape (48092104822).jpg",
    "beach and coastal landscape",
    ["coast"],
    ["coast"],
  ],
];
const cases = [];
async function save(file, url) {
  let bytes;
  try {
    bytes = await readFile(file);
  } catch {
    const assetUrl = new URL(url);
    if (assetUrl.hostname === "upload.wikimedia.org") assetUrl.search = "";
    let r = await fetch(assetUrl, {
      headers: { "User-Agent": "HiddenDataLocalEvaluation/1.0" },
    });
    for (let attempt = 0; r.status === 429 && attempt < 4; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      r = await fetch(assetUrl, {
        headers: { "User-Agent": "HiddenDataLocalEvaluation/1.0" },
      });
    }
    if (!r.ok) throw Error(`Image HTTP ${r.status}: ${url}`);
    bytes = Buffer.from(await r.arrayBuffer());
    await writeFile(file, bytes);
  }
  return {
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
for (let i = 0; i < ids.length; i++) {
  const row = data.rows[i].row;
  if (row.image_id !== ids[i])
    throw Error(
      "Published dataset order changed; do not silently replace fixtures",
    );
  const file = `${dir}/coco-${ids[i]}.jpg`;
  const audited = ids[i] === 74 ? ["pets"] : judgments[i][1];
  cases.push({
    id: `coco-${ids[i]}`,
    file,
    split: i % 2 === 0 ? "audit" : "held-out",
    source: "https://huggingface.co/datasets/detection-datasets/coco",
    sourceRow: i,
    imageId: ids[i],
    originalUrl: `http://images.cocodataset.org/train2017/${String(ids[i]).padStart(12, "0")}.jpg`,
    license:
      "COCO image-specific Flickr license not resolved; evaluation-only fixture, not a production asset",
    observation: judgments[i][0],
    relevantOriginal: judgments[i][1],
    relevantAudited: audited,
    ...(await save(file, row.image.src)),
  });
}
for (let i = 0; i < commons.length; i++) {
  const [id, title, observation, original, audited] = commons[i];
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(`File:${title}`)}&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=960&format=json`;
  const r = await fetch(url);
  if (!r.ok) throw Error(`Commons HTTP ${r.status}`);
  const info = Object.values((await r.json()).query.pages)[0].imageinfo[0];
  const file = `${dir}/${id}.jpg`;
  cases.push({
    id,
    file,
    split: i % 2 === 0 ? "audit" : "held-out",
    source: info.descriptionurl,
    originalUrl: info.url,
    downloadUrl: id === "tajine" || id === "coast" ? info.thumburl : info.url,
    fixtureVariant:
      id === "tajine" || id === "coast"
        ? "960px Commons thumbnail"
        : "original",
    license: info.extmetadata.LicenseShortName?.value ?? "unknown",
    licenseUrl: info.extmetadata.LicenseUrl?.value ?? null,
    authorHtml: info.extmetadata.Artist?.value ?? null,
    observation,
    relevantOriginal: original,
    relevantAudited: audited,
    ...(await save(file, info.thumburl ?? info.url)),
  });
}
await writeFile(
  `${dir}/benchmark.json`,
  JSON.stringify(
    {
      version: "readiness-24-photos-v1",
      selectedBeforeInference: true,
      selection:
        "First 16 COCO published training rows, without rejection or model-based selection, plus eight fixed Commons gap checks. None are the previous six photographs. Alternating source order assigns audit/held-out. Both libraries and judgments frozen before inference; no tuning after the audit split.",
      judgmentPolicy:
        "Visible main subject or setting must fit the supplied description, including explicit qualifiers. Accepted IDs recorded before model outputs, separately from scores. Empty lists mark no adequate candidate. One evaluator; these are qualitative relevance judgments, not independently adjudicated ground truth or population accuracy.",
      acceptance: {
        coveredTop1: 0.8,
        coveredLeading4: 0.9,
        unsupportedExplicitAbstention: 1,
        notes:
          "Product gates fixed before inference, not calibrated model-score thresholds. Leading four are the best plus the three alternatives actually displayed. No universal cosine cutoff. Explicit opt-in/download disclosure, privacy, fallback and resource error handling are mandatory; physical mobile unsupported until tested.",
      },
      cases,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Prepared ${cases.length} fixed photographs with byte hashes and separate relevance judgments.`,
);
