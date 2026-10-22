// Metadata and small text files only. Never downloads model weights or images.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const directory = "docs/phase-03/evidence/second-attempt";
await mkdir(directory, { recursive: true });
const records = [];
async function save(url, name, json = false) {
  const response = await fetch(url);
  if (!response.ok) throw Error(`${response.status} fetching ${url}`);
  const value = Buffer.from(await response.arrayBuffer());
  if (value.length > 2_000_000)
    throw Error("Unexpectedly large metadata response");
  await writeFile(`${directory}/${name}`, value);
  records.push({
    url,
    savedAs: name,
    bytes: value.length,
    sha256: createHash("sha256").update(value).digest("hex"),
  });
  return json ? JSON.parse(value.toString("utf8")) : value.toString("utf8");
}
const converter = await save(
  "https://huggingface.co/api/models/Xenova/mobileclip_s0?blobs=true",
  "mobileclip-converter-api.json",
  true,
);
const source = await save(
  "https://huggingface.co/api/models/apple/MobileCLIP-S0?blobs=true",
  "mobileclip-source-api.json",
  true,
);
const convertBase = `https://huggingface.co/Xenova/mobileclip_s0/resolve/${converter.sha}`;
const sourceBase = `https://huggingface.co/apple/MobileCLIP-S0/resolve/${source.sha}`;
await save(`${convertBase}/LICENSE`, "converter-LICENSE.txt");
await save(`${sourceBase}/LICENSE`, "source-LICENSE.txt");
await save(`${convertBase}/README.md`, "converter-card.md");
await save(`${sourceBase}/README.md`, "source-card.md");
const processor = await save(
  `${convertBase}/preprocessor_config.json`,
  "processor.json",
  true,
);
await save(`${convertBase}/config.json`, "config.json", true);
const assets = converter.siblings.filter((a) =>
  /^(?:onnx\/(?:text|vision)_model_(?:int8|quantized)\.onnx|(?:tokenizer(?:_config)?|preprocessor_config|config)\.json)$/.test(
    a.rfilename,
  ),
);
const runtime = JSON.parse(
  await readFile("research/assets/ai/manifest.json", "utf8"),
);
const localConfig = JSON.parse(
  await readFile("research/assets/ai/mobilenetv4/config.json", "utf8"),
);
const localAssetChecks = [];
for (const asset of runtime.assets) {
  const value = await readFile(`research/assets/ai/${asset.path}`);
  const sha256 = createHash("sha256").update(value).digest("hex");
  const match = value.length === asset.bytes && sha256 === asset.sha256;
  if (!match) throw Error(`Existing asset mismatch: ${asset.path}`);
  localAssetChecks.push({
    path: asset.path,
    bytes: value.length,
    sha256,
    match,
  });
}
const minimalQ8Files = [
  "onnx/text_model_quantized.onnx",
  "onnx/vision_model_quantized.onnx",
  "config.json",
  "preprocessor_config.json",
  "tokenizer.json",
  "tokenizer_config.json",
];
const modelSupportBytes = minimalQ8Files.reduce(
  (sum, name) => sum + assets.find((a) => a.rfilename === name).size,
  0,
);
const runtimeBytes = runtime.assets
  .filter((a) => a.path.startsWith("runtime/"))
  .reduce((s, a) => s + a.bytes, 0);
const summary = {
  checkedAt: new Date().toISOString(),
  status: "BLOCKED",
  task: "Identify supported broad visible-content categories, allowing multiple coexisting categories; abstain rather than force a scene or identity claim.",
  approachLimit: 2,
  approaches: [
    {
      id: "onnx-community/mobilenetv4_conv_small.e2400_r224_in1k",
      revision: runtime.modelRevision,
      task: "ImageNet-1k dominant-content classification",
      classes: localConfig.num_classes,
      availableTaxonomy:
        "1,000 ImageNet labels, not six broad multi-label content categories",
      decision:
        "Not selected for the narrowed broad-content task; object-family coarsening would need a separately justified and calibrated mapping, and would not establish people or indoor/outdoor support.",
    },
    {
      id: "Xenova/mobileclip_s0",
      revision: converter.sha,
      upstream: "apple/MobileCLIP-S0",
      upstreamRevision: source.sha,
      task: "Zero-shot image/text matching with separate ONNX encoders",
      processor,
      assets,
      minimalQ8Files,
      modelSupportBytes,
      modelSupportAndExistingRuntimeBytes: modelSupportBytes + runtimeBytes,
      assetVerification:
        "Remote sizes and hashes advertised by pinned Hub metadata only; no graph downloaded or independently hashed.",
      browserFeasibility:
        "Converter documents Transformers.js CLIPVisionModelWithProjection and CLIPTextModelWithProjection; exact exports not executed locally",
      decision:
        "Stopped before weight download: current upstream research-only model terms and converter's different software license do not substantiate product-use/redistribution clearance for the exact export. No claim of retroactive license applicability is made. Both q8 encoders plus existing runtime exceed the 80MB bound; vision-only inference with precomputed fixed text embeddings could reduce delivery below 50MB but was not implemented or measured and does not resolve licensing.",
    },
  ],
  runtimeBytes,
  localAssetChecks,
  limitsUsed: {
    approaches: 2,
    newModelWeightDownloads: 0,
    newImages: 0,
    newHeldOutPasses: 0,
    newBrowserInferenceBackends: 0,
  },
  evaluationDisposition:
    "Eligibility stopped before new corpus collection, scoring-protocol freeze, threshold fitting or held-out inference. Not an image-access failure. Previous test data is diagnostic context only; no new metrics or class thresholds are claimed.",
  productionIntegrated: false,
  records,
};
await writeFile(
  `${directory}/candidate-audit.json`,
  JSON.stringify(summary, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      converterRevision: converter.sha,
      sourceRevision: source.sha,
      assets,
      processor,
    },
    null,
    2,
  ),
);
