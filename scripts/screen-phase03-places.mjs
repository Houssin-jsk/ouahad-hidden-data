import { writeFile } from "node:fs/promises";
const root = "docs/phase-03/evidence/final";
const observations = [];
for (const url of [
  "https://api.github.com/repos/CSAILVision/places365/commits/master",
  "https://raw.githubusercontent.com/CSAILVision/places365/master/README.md",
  "https://raw.githubusercontent.com/CSAILVision/places365/master/categories_places365.txt",
  "https://huggingface.co/api/models?search=places365&limit=30",
  "https://places2.csail.mit.edu/models_places365/resnet18_places365.pth.tar",
  "http://places2.csail.mit.edu/models_places365/resnet18_places365.pth.tar",
]) {
  const weight = url.endsWith(".pth.tar");
  try {
    const r = await fetch(url, {
      method: weight ? "HEAD" : "GET",
      signal: AbortSignal.timeout(12000),
      headers: { "User-Agent": "HiddenData-local-audit" },
    });
    const text = weight ? null : await r.text();
    observations.push({
      url,
      status: r.status,
      bytes: r.headers.get("content-length"),
      text,
    });
  } catch (e) {
    observations.push({ url, error: String(e) });
  }
}
await writeFile(
  `${root}/places-screen.json`,
  JSON.stringify(observations, null, 2),
);
console.log(
  observations.map((o) => ({
    url: o.url,
    status: o.status,
    error: o.error,
    bytes: o.bytes,
    text: o.url.includes("api/models?") ? o.text?.slice(0, 2000) : undefined,
  })),
);
