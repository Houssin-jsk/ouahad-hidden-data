import { mkdir, writeFile } from "node:fs/promises";
const dir = "docs/phase-03/evidence/final";
await mkdir(dir, { recursive: true });
const ids = [
  "onnx-community/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M-ONNX",
  "wkcn/TinyCLIP-ViT-8M-16-Text-3M-YFCC15M",
];
const models = [];
for (let i = 0; i < ids.length; i++) {
  const r = await fetch(
    `https://huggingface.co/api/models/${ids[i]}?blobs=true`,
  );
  if (!r.ok) throw Error(String(r.status));
  const m = await r.json();
  models.push(m);
  await writeFile(
    `${dir}/${i ? "source" : "export"}-metadata.json`,
    JSON.stringify(m, null, 2),
  );
  for (const file of [
    "README.md",
    "LICENSE",
    "config.json",
    "preprocessor_config.json",
    "tokenizer_config.json",
  ]) {
    if (!m.siblings.some((s) => s.rfilename === file)) continue;
    const res = await fetch(
      `https://huggingface.co/${ids[i]}/resolve/${m.sha}/${file}`,
    );
    if (!res.ok) throw Error(String(res.status));
    await writeFile(
      `${dir}/${i ? "source" : "export"}-${file}`,
      Buffer.from(await res.arrayBuffer()),
    );
  }
}
console.log(
  models.map((m) => ({
    id: m.id,
    sha: m.sha,
    files: m.siblings.filter((s) => /onnx|LICENSE/.test(s.rfilename)),
  })),
);
await writeFile(
  `${dir}/audit.json`,
  JSON.stringify(
    models.map((m) => ({
      id: m.id,
      revision: m.sha,
      license: m.cardData?.license,
      files: m.siblings,
    })),
    null,
    2,
  ),
);
