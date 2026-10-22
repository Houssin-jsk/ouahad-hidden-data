import { readFile } from "node:fs/promises";
const file = process.argv[2] ?? "docs/evidence/phase-4-3-benchmark.json";
const evidence = JSON.parse(await readFile(file, "utf8"));
const { acceptance } = evidence.benchmark;
const summary = [];
for (const mode of ["discovery", "readiness"]) {
  for (const split of ["all", "audit", "held-out"]) {
    const records = evidence.records.filter(
      (r) => r.mode === mode && (split === "all" || r.split === split),
    );
    const covered = records.filter((r) => r.judgment.covered);
    const unsupported = records.filter((r) => !r.judgment.covered);
    const topRelevant = covered.filter((r) => r.judgment.topRelevant).length;
    const leading4Relevant = covered.filter(
      (r) => r.judgment.leading4Relevant,
    ).length;
    const explicitAbstentions = unsupported.filter(
      (r) => r.judgment.explicitlyAbstained,
    ).length;
    summary.push({
      mode,
      split,
      total: records.length,
      covered: covered.length,
      topRelevant,
      leading4Relevant,
      leading5Relevant: covered.filter((r) => r.judgment.leading5Relevant)
        .length,
      unsupported: unsupported.length,
      explicitAbstentions,
      gates: {
        topRelevant:
          covered.length > 0 &&
          topRelevant / covered.length >= acceptance.coveredTop1,
        displayedAlternatives:
          covered.length > 0 &&
          leading4Relevant / covered.length >= acceptance.coveredLeading4,
        unsupportedHandling:
          unsupported.length > 0 &&
          explicitAbstentions / unsupported.length >=
            acceptance.unsupportedExplicitAbstention,
      },
    });
  }
}
const heldOut = summary.filter((s) => s.split === "held-out");
console.log(
  JSON.stringify(
    {
      datasetVersion: evidence.benchmark.version,
      note: "Judgments target principal-scene relevance; no cosine threshold or probability conversion. Quality gates only; privacy/performance/product checks remain separate.",
      acceptance,
      summary,
      qualityPass: heldOut.every((s) => Object.values(s.gates).every(Boolean)),
      recommendation: "keep experimental",
    },
    null,
    2,
  ),
);
