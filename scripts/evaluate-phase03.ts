import { readFile, writeFile } from "node:fs/promises";
import { calibrate, quality, accepts } from "../src/experiments/vision/quality";
import type { ExperimentResult } from "../src/experiments/vision/types";
import benchmark from "../tests/fixtures/phase03/benchmark.json";
import config from "../research/assets/ai/mobilenetv4/config.json";
import type { AIResultV1 } from "../src/ai/result-contract";
async function main() {
  const evidence = JSON.parse(
    await readFile("docs/phase-03/evidence/browser-inference.json", "utf8"),
  ) as {
    records: {
      image: string;
      mode: string;
      split: string;
      wallMs: number;
      result: ExperimentResult;
      heartbeat: { maxGapMs: number; p95GapMs: number };
      pageJSHeap: { usedSize: number };
    }[];
  };
  const scene = evidence.records
    .filter((r) => r.mode === "readiness")
    .map((r) => {
      const fixture = benchmark.cases.find((f) => f.id === r.image)!;
      return {
        id: r.image,
        split: r.split,
        acceptedIds: fixture.sceneIds,
        ranking: r.result.discovery!.views[0].ranking.map((p) => ({
          id: p.id,
          score: p.cosine,
        })),
      };
    });
  const calibration = scene.filter((r) => r.split === "calibration");
  const policy = calibrate(calibration);
  const test = scene.filter((r) => r.split === "test");
  const q = quality(test, policy),
    g = benchmark.gates;
  const gates = {
    coveredTop1: (q.coveredTop1 ?? 0) >= g.coveredTop1,
    coveredTop4: (q.coveredTop4 ?? 0) >= g.coveredTop4,
    acceptedPrecision: (q.acceptedPrecision ?? 0) >= g.acceptedPrecision,
    coveredCoverage: (q.coveredCoverage ?? 0) >= g.coveredCoverage,
    unsupportedFalseAccepts: q.unsupportedAccepted === 0,
  };
  const rawPolicy = { minimumScore: -1, minimumMargin: 0 };
  const labelToId = config.label2id as Record<string, number>;
  const mobile = evidence.records
    .filter((r) => r.mode === "baseline")
    .map((r) => {
      const f = benchmark.cases.find((f) => f.id === r.image)!;
      return {
        id: r.image,
        split: r.split,
        acceptedIds: f.imageNetIds.map(String),
        ranking: r.result.predictions.map((p) => ({
          id: String(labelToId[p.label]),
          score: p.score,
        })),
      };
    });
  const percentile = (a: number[], p: number) => {
    const sorted = [...a].sort((a, b) => a - b);
    return sorted[Math.floor((sorted.length - 1) * p)];
  };
  const timing = Object.fromEntries(
    ["readiness", "baseline", "detector"].map((mode) => {
      const rows = evidence.records.filter((r) => r.mode === mode);
      const warm = rows.filter((r) => r.result.reused);
      const range = (a: number[]) =>
        a.length
          ? {
              min: Math.min(...a),
              median: percentile(a, 0.5),
              p95: percentile(a, 0.95),
              max: Math.max(...a),
            }
          : null;
      return [
        mode,
        {
          runs: rows.length,
          cold: rows
            .filter((r) => !r.result.reused)
            .map((r) => ({
              image: r.image,
              wallMs: r.wallMs,
              initializationMs: r.result.initializationMs,
            })),
          warmInitialization: range(warm.map((r) => r.result.initializationMs)),
          preprocessingMs: range(rows.map((r) => r.result.preprocessingMs)),
          inferenceMs: range(rows.map((r) => r.result.inferenceMs)),
          warmWallMs: range(warm.map((r) => r.wallMs)),
          mainThreadMaxHeartbeatGapMs: Math.max(
            ...rows.map((r) => r.heartbeat.maxGapMs),
          ),
          mainThreadLargestP95HeartbeatGapMs: Math.max(
            ...rows.map((r) => r.heartbeat.p95GapMs),
          ),
          pageJSHeapMaxSnapshotBytes: Math.max(
            ...rows.map((r) => r.pageJSHeap.usedSize),
          ),
          memoryLimitation:
            "Page V8 heap after inference only; excludes dedicated worker, native WASM, GPU and transient peak. Not a model memory budget.",
        },
      ];
    }),
  );
  const output = {
    protocol: benchmark.version,
    policy,
    calibration: quality(calibration, policy),
    test: q,
    rawCalibration: quality(calibration, rawPolicy),
    rawTest: quality(test, rawPolicy),
    gates,
    qualityPass: Object.values(gates).every(Boolean),
    decisions: scene.map((r) => ({ ...r, accepted: accepts(r, policy) })),
    stability: scene
      .filter((r) => r.split === "test-transform")
      .map((r) => {
        const f = benchmark.cases.find((f) => f.id === r.id)!;
        const parent = scene.find(
          (p) => p.id === ("parentId" in f ? f.parentId : ""),
        )!;
        return {
          id: r.id,
          parent: parent.id,
          sameTop1: r.ranking[0].id === parent.ranking[0].id,
          parentTop1: parent.ranking[0],
          transformedTop1: r.ranking[0],
          accepted: accepts(r, policy),
          parentAccepted: accepts(parent, policy),
        };
      }),
    mobileNet: {
      task: "Visible ImageNet content relevance, not scene accuracy. Full-taxonomy softmax is not correctness probability.",
      all: quality(mobile, rawPolicy),
      test: quality(
        mobile.filter((r) => r.split === "test"),
        rawPolicy,
      ),
      records: mobile,
    },
    timing,
  };
  await writeFile(
    "docs/phase-03/evidence/quality.json",
    JSON.stringify(output, null, 2) + "\n",
  );
  const contracts: AIResultV1[] = scene.map((row) => ({
    schemaVersion: "ai-result/1",
    model: {
      id: "Xenova/clip-vit-base-patch32",
      revision: "d15189d7028b43f1d3e65039190477f6af591c2a",
      task: "supplied-description-ranking",
      taxonomy: "ouahad-scenes-36-v2-audit",
      preprocessingVersion: "whole-frame-white-letterbox224-clip-normalize/v1",
    },
    backend: "wasm",
    scoreSemantics: "cosine-similarity",
    predictions: row.ranking.map((p) => ({
      id: p.id,
      label: p.id,
      rawScore: p.score,
    })),
    interpretation:
      "Research prediction among supplied descriptions; not a generated caption or a correctness probability.",
    abstention: {
      abstained: !accepts(row, policy),
      reason: accepts(row, policy)
        ? "Meets calibration-only score and margin policy; model remains unapproved."
        : "Below calibration-only score or margin threshold; insufficient support.",
    },
    limitations: [
      "Small single-annotator benchmark",
      "Unsupported content can resemble a supplied description",
      "No production model selected",
    ],
    evaluationReference: `phase03-natural-v1/${row.id}`,
    state: "complete",
    error: null,
  }));
  await writeFile(
    "docs/phase-03/evidence/ai-results-v1.json",
    JSON.stringify(contracts, null, 2) + "\n",
  );
  console.log(JSON.stringify({ policy, test: q, gates, timing }, null, 2));
}
void main();
