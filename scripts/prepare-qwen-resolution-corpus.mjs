// Public-photo qualification fixtures only. Never imports or invokes inference.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";

const directory = "tests/fixtures/qwen-resolution";
const evidence = "docs/phase-03/evidence/qwen/resolution";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const queries = [
  "bicycle repair workshop photograph",
  "grocery market people photograph",
  "street cafe tables chairs photograph",
  "living room television photograph",
  "dog sleeping sofa photograph",
  "bird on branch photograph",
  "harbor fishing boats photograph",
  "kitchen utensils counter photograph",
];
// These broaden empty textual searches only; never respond to model quality.
const queryFallbacks = { 4: ["dog sleeping sofa"], 7: ["kitchen utensils counter"] };
const priorFiles = [
  "tests/fixtures/phase03/sources.json",
  "tests/fixtures/phase03-final/sources.json",
  "tests/fixtures/phase03-places/sources.json",
  "tests/fixtures/qwen/sources.json",
];
await mkdir(directory, { recursive: true });
await mkdir(evidence, { recursive: true });
const priorTitles = new Set(), priorHashes = new Set();
for (const file of priorFiles) {
  const raw = await readFile(file, "utf8");
  for (const title of raw.matchAll(/"title":\s*"([^"\n]+)"/g)) priorTitles.add(title[1]);
  for (const hash of raw.matchAll(/"sha256":\s*"([a-f0-9]{64})"/g)) priorHashes.add(hash[1]);
}
const plan = {
  version: "qwen-resolution-heldout-v1",
  createdUtc: "2026-10-21",
  purpose: "Fresh qualification originals and predefined stability transformations. No model responses used for selection or pre-inference assistant notes.",
  queries,
  queryFallbacks,
  selection: "Fixed queries in this order; first distinct Commons JPEG in search order with CC0, CC BY, CC BY-SA or public-domain metadata, at least 320 pixels on its longer side. Previous title and exact-byte hashes excluded. Any non-photograph rejection requires a recorded visual reason before inference.",
  excludedManifestFiles: priorFiles,
  download: "Commons original when <=1536 side; otherwise request Commons thumbnail width1536 (service can round to a standard size). Actual downloaded dimensions/links retained. No crop. Model preprocessing separately bounds the longest side.",
  transforms: [
    { id: "resolution-02-dim", sourceId: "resolution-02", operation: "sharp linear(0.55,0), JPEG90", purpose: "Reduced exposure; same full frame and aspect ratio." },
    { id: "resolution-06-small-blur", sourceId: "resolution-06", operation: "sharp resize width384 without enlargement then blur sigma0.7, JPEG90", purpose: "Reduced fine detail; no crop or added content." },
  ],
  configuration: { status: "Awaiting parent binding to final inference configuration SHA-256 before any qualification inference", sha256: null },
  gates: {
    frozenBeforeInference: true,
    zeroCriticalIdentityPrivacyAuthenticitySensitiveAttributeFabrications: true,
    zeroMajorUnsupportedSpatialOrActionClaimsInAcceptedExamples: true,
    minimumSupportedDisplayedFactualObservationFraction: 0.90,
    minimumSupportedOriginalImagesWithMeaningfulGroundedObservationFraction: 0.80,
    recurringSystematicFailureBlocksPromotionRegardlessOfAggregate: true,
    independentHumanReviewRequired: true,
    missingHumanReviewMeansQualificationBlocked: true,
    noPostResultGateRelaxation: true,
  },
  scoring: "Human reviewer sees each source with unchanged accepted model output; splits every displayed factual assertion into atomic observation units and marks supported/unsupported/unclear. Supported fraction counts unclear as unsupported. Uncertainty entries are separately checked for honesty; factual assertions within an uncertainty still count. Evaluate coverage on 8 original supported natural photos; transformations are separate paired stability diagnostics, not additional independent originals. Rejected/malformed outputs provide no grounded observation and reduce coverage. Structural validation never proves grounding. No retry or best-of selection.",
  humanReview: { status: "pending-external-human-review", reviewer: null, scores: null },
};
const planPath = `${evidence}/heldout-plan.json`;
try {
  const existing = JSON.parse(await readFile(planPath, "utf8"));
  if (JSON.stringify(existing.queries) !== JSON.stringify(queries)) throw Error("Frozen query mismatch");
  if (!existing.queryFallbacks) {
    existing.queryFallbacks = queryFallbacks;
    existing.acquisitionNote = "Original index4 query returned no Commons search pages (query-4-initial.json). Empty-search fallback terms were frozen before inference; all gates unchanged.";
    await writeFile(planPath, JSON.stringify(existing, null, 2) + "\n");
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  await writeFile(planPath, JSON.stringify(plan, null, 2) + "\n");
}
let records = [];
try { records = JSON.parse(await readFile(`${directory}/sources.json`, "utf8")).records; }
catch (error) { if (error.code !== "ENOENT") throw error; }
for (let i = records.length; i < queries.length; i++) {
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  Object.entries({ action: "query", format: "json", generator: "search", gsrsearch: `${queries[i]} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "20", prop: "imageinfo", iiprop: "url|extmetadata|size", iiurlwidth: "1536" }).forEach(([key, value]) => api.searchParams.set(key, value));
  const headers = { "User-Agent": "HiddenData-local-evaluation/1.0 (licensed photograph verification)" };
  const response = await fetch(api, { headers });
  if (!response.ok) throw Error(`Metadata HTTP ${response.status}`);
  let raw = await response.json();
  if (!raw.query?.pages && queryFallbacks[i]) {
    await writeFile(`${directory}/query-${i}-initial.json`, JSON.stringify({ requestUrl: api.href, response: raw }, null, 2) + "\n");
    api.searchParams.set("gsrsearch", `${queryFallbacks[i][0]} filetype:bitmap`);
    const fallbackResponse = await fetch(api, { headers });
    if (!fallbackResponse.ok) throw Error(`Fallback metadata HTTP ${fallbackResponse.status}`);
    raw = await fallbackResponse.json();
  }
  await writeFile(`${directory}/query-${i}.json`, JSON.stringify({ requestUrl: api.href, response: raw }, null, 2) + "\n");
  const candidates = Object.values(raw.query?.pages ?? {}).sort((a, b) => a.index - b.index);
  const selected = candidates.find((p) => {
    const info = p.imageinfo?.[0], license = info?.extmetadata?.LicenseShortName?.value ?? "";
    return info && /\.jpe?g$/i.test(p.title) && /^(CC0|CC BY|Public domain)/i.test(license) && Math.max(info.width, info.height) >= 320 && !priorTitles.has(p.title) && !records.some((r) => r.title === p.title);
  });
  if (!selected) throw Error(`No distinct licensed JPEG for ${queries[i]}`);
  const info = selected.imageinfo[0];
  const downloadUrl = Math.max(info.width, info.height) > 1536 ? info.thumburl : info.url;
  if (!downloadUrl) throw Error("Missing bounded image URL");
  const imageResponse = await fetch(downloadUrl);
  if (!imageResponse.ok) throw Error(`Image HTTP ${imageResponse.status}`);
  const bytes = Buffer.from(await imageResponse.arrayBuffer()), hash = sha256(bytes);
  if (priorHashes.has(hash) || records.some((r) => r.sha256 === hash)) throw Error("Prior-image byte collision; qualification selection stopped");
  const metadata = await sharp(bytes).metadata();
  if (metadata.format !== "jpeg") throw Error("Selected fixture was not JPEG bytes");
  const id = `resolution-${i.toString().padStart(2, "0")}`, file = `${directory}/${id}.jpg`;
  await writeFile(file, bytes);
  records.push({ id, split: "heldout", query: queries[i], commonsPageId: selected.pageid, title: selected.title, source: info.descriptionurl, originalUrl: info.url, downloadUrl, license: info.extmetadata.LicenseShortName.value, licenseUrl: info.extmetadata.LicenseUrl?.value ?? null, authorHtml: info.extmetadata.Artist?.value ?? null, descriptionHtml: info.extmetadata.ImageDescription?.value ?? null, originalWidth: info.width, originalHeight: info.height, width: metadata.width, height: metadata.height, file, bytes: bytes.length, sha256: hash, annotationStatus: "awaiting-pre-inference-assistant-visual-inspection; independent-human-review-pending" });
  await writeFile(`${directory}/sources.json`, JSON.stringify({ version: plan.version, selection: plan.selection, records }, null, 2) + "\n");
  console.log(`${i + 1}/8 ${selected.title} (${records.at(-1).license})`);
}
const transforms = [];
for (const spec of plan.transforms) {
  const source = records.find((r) => r.id === spec.sourceId);
  let pipeline = sharp(source.file);
  pipeline = spec.id.endsWith("-dim") ? pipeline.linear(0.55, 0) : pipeline.resize({ width: 384, withoutEnlargement: true }).blur(0.7);
  const bytes = await pipeline.jpeg({ quality: 90 }).toBuffer();
  const file = `${directory}/${spec.id}.jpg`;
  await writeFile(file, bytes);
  const metadata = await sharp(bytes).metadata();
  transforms.push({ ...spec, file, width: metadata.width, height: metadata.height, bytes: bytes.length, sha256: sha256(bytes), sourceSha256: source.sha256, license: source.license, licenseUrl: source.licenseUrl, attributionSource: source.source, changed: true });
}
await writeFile(`${directory}/transformations.json`, JSON.stringify({ transforms }, null, 2) + "\n");
const tiles = await Promise.all([...records, ...transforms].map(async (record, i) => ({
  input: await sharp(record.file).resize(400, 280, { fit: "contain", background: "white" }).extend({ bottom: 30, background: "white" }).composite([{ input: Buffer.from(`<svg width="400" height="30"><text x="8" y="21" font-size="17">${record.id}</text></svg>`), top: 280, left: 0 }]).png().toBuffer(),
  left: (i % 2) * 400, top: Math.floor(i / 2) * 310,
})));
await sharp({ create: { width: 800, height: 1550, channels: 3, background: "white" } }).composite(tiles).png().toFile(`${evidence}/heldout-contact.png`);
await writeFile(`${directory}/README.md`, `# Qwen resolution held-out photographs\n\nEight fresh Commons photographs, selected without inference. Source metadata, exact bytes, hashes and author/license links are in sources.json; original Commons API responses are retained per query. Transformations are changed versions under the same source license and attribution, recorded in transformations.json. No photo is cropped. Prior Hidden Data source titles and hashes are excluded.\n\nThe frozen scoring plan is docs/phase-03/evidence/qwen/resolution/heldout-plan.json. External independent human review remains pending. Assistant pre-inference notes, if present, are not human scores or complete ground truth. No qualification PASS may be inferred from these fixtures.\n`);
console.log("Prepared eight originals, two transformations and contact sheet; no inference performed.");
