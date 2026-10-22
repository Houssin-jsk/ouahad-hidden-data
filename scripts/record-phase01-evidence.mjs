import { readFile, readdir, stat, writeFile, mkdir, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import path from "node:path";
const root = process.cwd();
const target = path.join(root, "docs/phase-01/evidence");
await mkdir(target, { recursive: true });
const report = JSON.parse(await readFile(path.join(root, "test-results/phase01-release.json"), "utf8"));
const cases = [];
const conditions = [];
function collect(suites) {
  for (const suite of suites) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        cases.push({ title: spec.title, file: spec.file, status: test.status, results: test.results.map((r) => ({ status: r.status, durationMs: r.duration, errors: r.errors })) });
        for (const result of test.results)
          for (const attachment of result.attachments ?? [])
            if (attachment.name === "runtime-conditions" && attachment.body)
              conditions.push(JSON.parse(Buffer.from(attachment.body, "base64").toString()));
      }
    }
    collect(suite.suites ?? []);
  }
}
collect(report.suites);
async function files(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await files(file));
    else output.push(file);
  }
  return output;
}
const chunks = [];
for (const file of await files(path.join(root, ".next/static"))) {
  if (!file.endsWith(".js")) continue;
  const buffer = await readFile(file);
  chunks.push({ file: path.relative(root, file).replaceAll("\\", "/"), bytes: buffer.length, gzipBytes: gzipSync(buffer).length });
}
const fixtures = [];
for (const file of await files(path.join(root, "tests/fixtures/phase01"))) {
  if (file.endsWith(".md")) continue;
  const buffer = await readFile(file);
  fixtures.push({ file: path.basename(file), bytes: (await stat(file)).size, sha256: createHash("sha256").update(buffer).digest("hex") });
}
const dependencies = {};
for (const name of ["next", "react", "react-dom", "typescript", "exifreader", "@playwright/test", "@huggingface/transformers"])
  dependencies[name] = JSON.parse(await readFile(path.join(root, "node_modules", name, "package.json"), "utf8")).version;
await writeFile(path.join(target, "verification.json"), JSON.stringify({ recordedAt: new Date().toISOString(), dependencies, browser: { stats: report.stats, errors: report.errors, tests: cases }, conditions, bundle: { note: "All emitted static JS, including framework and deferred worker chunks; not initial-route transfer size or a mobile benchmark. Gzip computed locally, not observed HTTP transfer.", totalBytes: chunks.reduce((s,c) => s+c.bytes,0), totalGzipBytes: chunks.reduce((s,c) => s+c.gzipBytes,0), chunks }, fixtures }, null, 2) + "\n");
await copyFile(path.join(root, ".next/release-verification.json"), path.join(target, "release-verification.json"));
for (const file of ["release-1440.png", "release-390.png"])
  await copyFile(path.join(root, "test-results", file), path.join(target, file));
console.log(JSON.stringify({ browser: report.stats, testCases: cases.length, conditions, fixtureCount: fixtures.length, totalStaticJsBytes: chunks.reduce((s,c) => s+c.bytes,0), totalStaticGzipBytes: chunks.reduce((s,c) => s+c.gzipBytes,0) }, null, 2));
