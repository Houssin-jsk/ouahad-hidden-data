import { performance } from "node:perf_hooks";
import { writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import { analyzePixels } from "../src/analysis/pixels.ts";
import { analyzeEvidence } from "../src/analysis/insights.ts";
import { SAMPLE_BUDGET } from "../src/analysis/sampling.ts";
const timings = [];
for (const pattern of ["uniform", "ramp", "texture"]) {
  const pixels = new Uint8ClampedArray(SAMPLE_BUDGET * 4);
  for (let i = 0; i < SAMPLE_BUDGET; i++)
    pixels.set(
      pattern === "uniform"
        ? [128, 128, 128, 255]
        : pattern === "ramp"
          ? [i % 256, i % 256, i % 256, 255]
          : [i % 256, (i * 73) % 256, ((i * 151) ^ (i >>> 8)) % 256, 255],
      i * 4,
    );
  const sampling = { mode: "all-pixels" as const, sourcePixels: SAMPLE_BUDGET };
  for (let i = 0; i < 2; i++) {
    const s = analyzePixels(pixels);
    analyzeEvidence(pixels, undefined, s, sampling);
  }
  const baselineMs = [],
    insightsMs = [],
    combinedMs = [];
  for (let i = 0; i < 7; i++) {
    let start = performance.now();
    const statistics = analyzePixels(pixels);
    baselineMs.push(performance.now() - start);
    start = performance.now();
    const report = analyzeEvidence(pixels, undefined, statistics, sampling);
    insightsMs.push(performance.now() - start);
    if (report.tonal.status !== "available")
      throw Error("Benchmark analytics unavailable");
    start = performance.now();
    const s = analyzePixels(pixels);
    analyzeEvidence(pixels, undefined, s, sampling);
    combinedMs.push(performance.now() - start);
  }
  const summarize = (values: number[]) => ({
    medianMs: [...values].sort((a, b) => a - b)[3],
    minMs: Math.min(...values),
    maxMs: Math.max(...values),
    runsMs: values,
  });
  timings.push({
    pattern,
    pixels: SAMPLE_BUDGET,
    phase01UnchangedStatistics: summarize(baselineMs),
    phase02InsightsOnly: summarize(insightsMs),
    phase02Combined: summarize(combinedMs),
  });
  pixels.fill(0);
}
await mkdir("docs/phase-02/evidence", { recursive: true });
const evidence = {
  node: process.version,
  platform: os.platform(),
  release: os.release(),
  cpu: os.cpus()[0]?.model,
  logicalCPUs: os.cpus().length,
  conditions:
    "Node pure-function microbenchmark on identical preallocated synthetic RGBA buffers; two warmups then seven iterations per case. Phase 01 analyzePixels implementation is unchanged. No decoding/canvas/metadata/maps, browser startup, six-second presentation or native memory measurement. Sequential baseline/insights/combined measurements include normal GC and scheduling noise; no speedup is inferred.",
  timings,
};
await writeFile(
  "docs/phase-02/evidence/compute-benchmark.json",
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log(JSON.stringify(evidence, null, 2));
