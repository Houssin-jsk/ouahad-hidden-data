import { readFile, writeFile, copyFile } from "node:fs/promises";
import assert from "node:assert/strict";
const root = "docs/phase-03/evidence";
const json = async (name) => {
  const raw = await readFile(`${root}/${name}`, "utf8");
  return JSON.parse(raw.slice(raw.indexOf("{")));
};
const first = await json("release-browser-first.json");
const recheck = await json("release-browser-recheck.log");
const final = await json("release-browser-final.json");
const replay = await json("reproduction-test.log");
const unit = await readFile(`${root}/unit-tests.log`, "utf8");
const unitCounts = Object.fromEntries(
  ["tests", "pass", "fail", "skipped"].map((key) => [
    key,
    Number(unit.match(new RegExp(`(?:^|\\n)[^\\r\\n]*${key} (\\d+)`))?.[1]),
  ]),
);
assert.equal(unitCounts.tests, 82);
assert.equal(unitCounts.pass, 82);
assert.equal(unitCounts.fail, 0);
assert.equal(final.stats.expected, 50);
assert.equal(final.stats.unexpected, 0);
assert.equal(recheck.stats.expected, 3);
assert.equal(replay.stats.expected, 1);
const build = await readFile(`${root}/production-build.log`, "utf8");
assert.match(build, /Release verified:/);
await copyFile(
  ".next/release-verification.json",
  `${root}/release-isolation.json`,
);
const isolation = await json("release-isolation.json");
const assets = await json("asset-audit.json");
assert(
  assets.checked.every((a) => a.match) &&
    assets.fixtureChecks.every((a) => a.match) &&
    assets.runtimeChecks.every((a) => a.match),
);
const quality = await json("quality.json");
const primary = await json("browser-inference.json");
const reproduced = await json("reproduction.json");
const summary = {
  recordedAt: new Date().toISOString(),
  phase03: "BLOCKED",
  selectedModel: null,
  reason:
    "Calibrated covered test coverage 1/7 < .5; no qualifying production candidate. Converted-asset clearance and actual Vercel hosting qualification also incomplete.",
  units: unitCounts,
  browser: {
    initial: first.stats,
    unchangedRecheck: recheck.stats,
    finalSerial: final.stats,
  },
  research: {
    corpusTest: {
      passed: 1,
      source:
        "Observed successful Playwright process session68757; lifecycle.json written after all assertions",
    },
    reproduction: replay.stats,
    recordedInferences: primary.records.length + reproduced.records.length,
    additionalSuccessfulManualRetry: true,
    gpuProbe: reproduced.gpuProbe,
  },
  qualityGates: quality.gates,
  observedCommandOutcomes: {
    unit: "passed",
    lint: "passed",
    typecheck: "passed",
    researchBuild: "passed",
    productionBuild: "passed",
    releaseInspection: "passed",
  },
  isolation,
  assets: {
    audited: assets.checked.length,
    fixtures: assets.fixtureChecks.length,
    installedRuntimeMatches: assets.runtimeChecks.length,
  },
  productionModified: false,
  committed: false,
  pushed: false,
  phase04Started: false,
};
await writeFile(
  `${root}/verification-summary.json`,
  JSON.stringify(summary, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      phase03: summary.phase03,
      units: summary.units,
      finalBrowser: final.stats,
      recordedInferences: summary.research.recordedInferences,
    },
    null,
    2,
  ),
);
