import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const directory = "tests/fixtures/phase03-final";
await mkdir(directory, { recursive: true });
const queries = [
  "alpine lake scenery",
  "tropical waterfall scenery",
  "city skyline buildings",
  "busy city intersection traffic",
  "office room interior",
  "dining room interior",
  "horse pasture photograph",
  "giraffe zoo photograph",
  "pasta served plate",
  "fruit bowl photograph",
  "steam locomotive photograph",
  "sailing yacht photograph",
  "human portrait closeup",
  "human face portrait photograph",
  "flower macro closeup",
  "orchid macro photograph",
  "wristwatch closeup",
  "jewellery necklace photograph",
  "tree bark texture closeup",
  "stone texture closeup",
  "abstract painting artwork photograph",
  "sculpture abstract art photograph",
  "printed document page photograph",
  "handwritten letter photograph",
];
const manifestPath = `${directory}/sources.json`;
const old = JSON.parse(
  await readFile("tests/fixtures/phase03/sources.json", "utf8"),
).records;
let previous;
try {
  previous = JSON.parse(await readFile(manifestPath, "utf8"));
} catch {}
const records = previous?.records ?? [];
for (let i = records.length; i < queries.length; i++) {
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  const params = {
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: `${queries[i]} filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: "10",
    prop: "imageinfo",
    iiprop: "url|extmetadata|size",
    iiurlwidth: "768",
  };
  Object.entries(params).forEach(([k, v]) => api.searchParams.set(k, v));
  const response = await fetch(api, {
    headers: {
      "User-Agent":
        "HiddenData-local-evaluation/1.0 (public-licensed image research)",
    },
  });
  if (!response.ok) throw Error(`Commons metadata ${response.status}`);
  const raw = await response.json();
  await writeFile(
    `${directory}/query-${i}.json`,
    JSON.stringify(raw, null, 2) + "\n",
  );
  const candidates = Object.values(raw.query?.pages ?? {}).sort(
    (a, b) => a.index - b.index,
  );
  const selected = candidates.find((p) => {
    const info = p.imageinfo?.[0],
      license = info?.extmetadata?.LicenseShortName?.value ?? "";
    return (
      info &&
      /\.jpe?g$/i.test(p.title) &&
      /^(CC0|CC BY|Public domain)/i.test(license) &&
      ![...records, ...old].some((r) => r.title === p.title)
    );
  });
  if (!selected)
    throw Error(`No clearly licensed JPEG for query ${queries[i]}`);
  const info = selected.imageinfo[0],
    url = info.thumburl ?? info.url;
  const image = await fetch(url);
  if (!image.ok)
    throw Error(`Commons image ${image.status} for ${selected.title}`);
  const buffer = Buffer.from(await image.arrayBuffer());
  const file = `${directory}/natural-${i.toString().padStart(2, "0")}.jpg`;
  await writeFile(file, buffer);
  records.push({
    id: `natural-${i.toString().padStart(2, "0")}`,
    split: i % 2 === 0 ? "calibration" : "test",
    query: queries[i],
    title: selected.title,
    source: info.descriptionurl,
    downloadUrl: url,
    license: info.extmetadata.LicenseShortName.value,
    licenseUrl: info.extmetadata.LicenseUrl?.value ?? null,
    authorHtml: info.extmetadata.Artist?.value ?? null,
    descriptionHtml: info.extmetadata.ImageDescription?.value ?? null,
    width: info.thumbwidth ?? info.width,
    height: info.thumbheight ?? info.height,
    file,
    bytes: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    annotationStatus: "awaiting-visual-inspection-before-inference",
  });
  await writeFile(
    manifestPath,
    JSON.stringify(
      {
        version: "phase03-sources-v1",
        selection:
          "Fixed queries in fixed order; first distinct clearly licensed JPEG in Commons search order; no model output used. Alternating query index assigns calibration/test. Ground truth is added only after visual inspection and before inference.",
        records,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`${i + 1}/16 ${selected.title} (${records.at(-1).license})`);
}
