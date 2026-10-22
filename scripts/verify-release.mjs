import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const lists = await Promise.all(
    entries.map((e) =>
      e.isDirectory()
        ? files(path.join(dir, e.name))
        : [path.join(dir, e.name)],
    ),
  );
  return lists.flat();
}
const routes = JSON.parse(
  await readFile(
    path.join(root, ".next/server/app-paths-manifest.json"),
    "utf8",
  ),
);
const forbidden = /experiments|(?:^|\/)ai(?:\/|$)/i;
const approved = new Set([
  "/api/cloud-vision/route",
  "/admin/ai/page",
  "/api/admin/ai/route",
  "/api/admin/ai/session/route",
]);
if (
  Object.keys(routes).some(
    (route) => forbidden.test(route) && !approved.has(route),
  )
)
  throw Error("Research route in release manifest");
if (
  Object.keys(routes).some(
    (route) => route.startsWith("/api/") && !approved.has(route),
  )
)
  throw Error("Unapproved API route in release manifest");
if (!routes["/api/cloud-vision/route"])
  throw Error("Approved Cloud Vision endpoint missing");
const publicFiles = await files(path.join(root, "public"));
if (
  publicFiles.some(
    (file) =>
      /\.(onnx|wasm|gguf|exe|dll|py)$/i.test(file) ||
      forbidden.test(
        path.relative(path.join(root, "public"), file).replaceAll("\\", "/"),
      ),
  )
)
  throw Error("Research/model assets under release public directory");
const output = [
  ...(await files(path.join(root, ".next/static"))),
  ...(await files(path.join(root, ".next/server"))),
];
if (output.some((file) => /\.(onnx|wasm|gguf|exe|dll|py)$/i.test(file)))
  throw Error("Model/runtime binary in release output");
const tokens =
  /@huggingface\/transformers|onnxruntime|MobileNetV4|clip-vit-base|yolos|model_quantized\.onnx|research\/assets|companion-dist|companion\/service\.py|llama-server\.exe|127\.0\.0\.1:18431|COMPANION_ADDRESS|Connect companion/i;
let inspected = 0;
for (const file of output) {
  if (!/\.(?:js|json)$/.test(file)) continue;
  const contents = await readFile(file, "utf8");
  if (file.endsWith(".nft.json")) {
    const trace = JSON.parse(contents);
    if (
      (trace.files ?? []).some(
        (entry) =>
          /\.(onnx|wasm|gguf|exe|dll|py)$/i.test(entry) ||
          /(?:^|[\\/])(research|companion|companion-dist)(?:[\\/])/i.test(
            entry,
          ),
      )
    )
      throw Error("Model, companion or research path in deployment trace");
  }
  if (tokens.test(contents))
    throw Error(
      `AI dependency or asset in release output: ${path.relative(root, file)}`,
    );
  if (
    file.startsWith(path.join(root, ".next/static")) &&
    /GEMINI_API_KEY|NVIDIA_API_KEY|CLOUDFLARE_API_TOKEN|CLOUDFLARE_D1_API_TOKEN|CLOUD_AI_D1_API_TOKEN|CLOUD_AI_ADMIN_SECRET|CLOUD_AI_INVITES|x-goog-api-key|integrate\.api\.nvidia\.com/.test(
      contents,
    )
  )
    throw Error("Server provider configuration in browser bundle");
  inspected++;
}
const report = {
  target:
    "browser analytics with restricted, consent-based server Cloud Vision",
  routes: Object.keys(routes),
  publicFiles: publicFiles.map((f) => path.relative(root, f)),
  inspectedOutputFiles: inspected,
  aiTokensFound: false,
  modelAssetsFound: false,
};
await mkdir(path.join(root, ".next"), { recursive: true });
await writeFile(
  path.join(root, ".next/release-verification.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  `Release verified: ${Object.keys(routes).join(", ")}; ${inspected} output/trace files inspected; no AI models or research routes.`,
);
