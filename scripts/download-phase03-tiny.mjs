import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const meta = JSON.parse(
  await readFile("docs/phase-03/evidence/final/export-metadata.json"),
);
const root = "research/assets/experiments/ai/tiny";
await mkdir(`${root}/onnx`, { recursive: true });
const records = [];
for (const name of [
  "config.json",
  "preprocessor_config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "onnx/model_int8.onnx",
]) {
  const response = await fetch(
    `https://huggingface.co/${meta.id}/resolve/${meta.sha}/${name}`,
  );
  if (!response.ok) throw Error(`${name}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const expected = meta.siblings.find((s) => s.rfilename === name);
  if (expected?.lfs?.sha256 && expected.lfs.sha256 !== sha256)
    throw Error("Checksum mismatch");
  await writeFile(`${root}/${name}`, bytes);
  records.push({ name, bytes: bytes.length, sha256 });
}
await writeFile(
  "docs/phase-03/evidence/final/tiny-assets.json",
  JSON.stringify({ id: meta.id, revision: meta.sha, records }, null, 2),
);
