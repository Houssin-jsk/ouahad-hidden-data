import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
const baseline = JSON.parse(
  await readFile("research/assets/ai/manifest.json", "utf8"),
);
const experiments = JSON.parse(
  await readFile("research/assets/experiments/ai/manifest.json", "utf8"),
);
const entries = [
  ...baseline.assets.map((a) => ({
    ...a,
    file: `research/assets/ai/${a.path}`,
  })),
  ...experiments.models.flatMap((m) =>
    m.assets.map((a) => ({
      ...a,
      file: `research/assets/experiments/ai/${m.dir}/${a.path}`,
    })),
  ),
];
const checked = [];
for (const entry of entries) {
  const data = await readFile(entry.file),
    sha256 = createHash("sha256").update(data).digest("hex");
  checked.push({
    ...entry,
    observedBytes: data.length,
    observedSHA256: sha256,
    match: data.length === entry.bytes && sha256 === entry.sha256,
  });
}
const corpus = JSON.parse(
  await readFile("tests/fixtures/phase03/benchmark.json", "utf8"),
);
const fixtureChecks = [];
for (const item of corpus.cases) {
  const data = await readFile(item.file);
  const dimensions = await sharp(data).metadata();
  fixtureChecks.push({
    id: item.id,
    encodedWidth: dimensions.width,
    encodedHeight: dimensions.height,
    sourceReportedWidth: item.width,
    sourceReportedHeight: item.height,
    match:
      data.length === item.bytes &&
      createHash("sha256").update(data).digest("hex") === item.sha256,
  });
}
const versions = {
  transformers: JSON.parse(
    await readFile(
      "node_modules/@huggingface/transformers/package.json",
      "utf8",
    ),
  ).version,
  onnxruntimeWeb: JSON.parse(
    await readFile("node_modules/onnxruntime-web/package.json", "utf8"),
  ).version,
  next: JSON.parse(await readFile("node_modules/next/package.json", "utf8"))
    .version,
};
const runtimeChecks = [];
for (const entry of baseline.assets.filter((a) =>
  a.path.startsWith("runtime/"),
)) {
  const name = entry.path.split("/").at(-1);
  const data = await readFile(`node_modules/onnxruntime-web/dist/${name}`);
  runtimeChecks.push({
    file: name,
    match: createHash("sha256").update(data).digest("hex") === entry.sha256,
  });
}
await mkdir("docs/phase-03/evidence", { recursive: true });
await writeFile(
  "docs/phase-03/evidence/asset-audit.json",
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      versions,
      baseline,
      experiments,
      checked,
      fixtureChecks,
      runtimeChecks,
    },
    null,
    2,
  ) + "\n",
);
if ([...checked, ...fixtureChecks, ...runtimeChecks].some((x) => !x.match))
  throw Error("Asset checksum mismatch");
console.log(
  `Verified ${checked.length} model/support/runtime assets, ${fixtureChecks.length} fixture files, ${runtimeChecks.length} exact installed runtime copies`,
);
