import {
  readFile,
  readdir,
  writeFile,
  mkdir,
  copyFile,
} from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import path from "node:path";
const root = process.cwd(),
  directory = path.join(root, "docs/phase-02/evidence");
await mkdir(directory, { recursive: true });
const report = JSON.parse(
  await readFile("test-results/phase02-release.json", "utf8"),
);
const phase01 = JSON.parse(
  await readFile("docs/phase-01/evidence/verification.json", "utf8"),
);
const cases = [],
  performanceEvidence = [];
function collect(suites) {
  for (const suite of suites) {
    for (const spec of suite.specs ?? [])
      for (const test of spec.tests ?? []) {
        cases.push({
          title: spec.title,
          file: spec.file,
          status: test.status,
          results: test.results.map((r) => ({
            status: r.status,
            durationMs: r.duration,
            errors: r.errors,
          })),
        });
        for (const result of test.results)
          for (const attachment of result.attachments ?? [])
            if (attachment.name === "phase02-performance" && attachment.body)
              performanceEvidence.push(
                JSON.parse(Buffer.from(attachment.body, "base64").toString()),
              );
      }
    collect(suite.suites ?? []);
  }
}
collect(report.suites);
if (
  report.stats.unexpected ||
  report.stats.skipped ||
  cases.length !== 50 ||
  !performanceEvidence.length
)
  throw Error("Final browser report is incomplete or has failures/skips");
async function files(dir) {
  const output = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...(await files(file)));
    else output.push(file);
  }
  return output;
}
const chunks = [];
for (const file of await files(path.join(root, ".next/static"))) {
  if (!file.endsWith(".js")) continue;
  const buffer = await readFile(file);
  chunks.push({
    file: path.relative(root, file).replaceAll("\\", "/"),
    bytes: buffer.length,
    gzipBytes: gzipSync(buffer).length,
  });
}
const bundle = {
  totalBytes: chunks.reduce((s, c) => s + c.bytes, 0),
  totalGzipBytes: chunks.reduce((s, c) => s + c.gzipBytes, 0),
  chunks,
};
const comparison = {
  phase01AggregateStaticJsBytes: phase01.bundle.totalBytes,
  phase02AggregateStaticJsBytes: bundle.totalBytes,
  rawDeltaBytes: bundle.totalBytes - phase01.bundle.totalBytes,
  phase01AggregateStaticGzipBytes: phase01.bundle.totalGzipBytes,
  phase02AggregateStaticGzipBytes: bundle.totalGzipBytes,
  gzipDeltaBytes: bundle.totalGzipBytes - phase01.bundle.totalGzipBytes,
  note: "Aggregate emitted JS, including framework/deferred worker chunks; not initial network transfer. Phase 01 did not record initial resource transfer or worker wall time. Only user-visible fixture timings and aggregate artifacts have a historical Phase 01 baseline.",
  timings: performanceEvidence[0].timings.map((t) => ({
    fixture: t.fixture,
    phase01VisibleMs: phase01.conditions[0].timings.find(
      (b) => b.fixture === t.fixture,
    )?.ms,
    phase02VisibleMs: t.visibleMs,
    phase02WorkerWallMs: t.workerWallMs,
  })),
};
const corpus = [];
for (const fixture of phase01.fixtures) {
  const buffer = await readFile(
    path.join(root, "tests/fixtures/phase01", fixture.file),
  );
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  if (sha256 !== fixture.sha256)
    throw Error(`Phase 01 fixture changed: ${fixture.file}`);
  corpus.push({ file: fixture.file, sha256, unchanged: true });
}
const evidence = {
  recordedAt: new Date().toISOString(),
  browser: { stats: report.stats, errors: report.errors, tests: cases },
  performance: performanceEvidence,
  comparison,
  bundle,
  phase01Corpus: corpus,
};
await writeFile(
  path.join(directory, "verification.json"),
  JSON.stringify(evidence, null, 2) + "\n",
);
await copyFile(
  ".next/release-verification.json",
  path.join(directory, "release-verification.json"),
);
for (const width of [320, 768, 1440])
  for (const view of ["tonal", "color"])
    await copyFile(
      `test-results/phase02-${view}-${width}.png`,
      path.join(directory, `${view}-${width}.png`),
    );
console.log(
  JSON.stringify(
    { browser: report.stats, comparison, performance: performanceEvidence },
    null,
    2,
  ),
);
