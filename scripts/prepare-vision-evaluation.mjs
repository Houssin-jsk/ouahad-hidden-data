import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(
  await readFile(
    path.join(root, "research/assets/experiments/ai/manifest.json"),
    "utf8",
  ),
);
for (const model of manifest.models) {
  for (const asset of model.assets) {
    const destination = path.join(
      root,
      "research/assets/experiments/ai",
      model.dir,
      asset.path,
    );
    const valid = (bytes) =>
      bytes.length === asset.bytes &&
      createHash("sha256").update(bytes).digest("hex") === asset.sha256;
    try {
      if (valid(await readFile(destination))) {
        console.log(`Verified ${model.dir}/${asset.path}`);
        continue;
      }
    } catch {
      /* Download missing assets. */
    }
    const response = await fetch(
      `https://huggingface.co/${model.id}/resolve/${model.revision}/${asset.path}`,
    );
    if (!response.ok)
      throw Error(
        `Download failed for ${model.id}/${asset.path}: ${response.status}`,
      );
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!valid(bytes))
      throw Error(`Pinned asset integrity mismatch: ${model.id}/${asset.path}`);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination + ".download", bytes);
    await rename(destination + ".download", destination);
    console.log(`Prepared ${model.dir}/${asset.path} (${asset.bytes} bytes)`);
  }
}
