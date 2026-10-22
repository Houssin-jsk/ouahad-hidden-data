import { loadEnvConfig } from "@next/env";
import { chromium, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { configuredLedger } from "../src/cloud-vision/server/database";
import { verifiedUntil } from "../src/cloud-vision/server/config";
import {
  CLOUD_SMOKE_RESPONSE_TIMEOUT_MS,
  validateCloudResult,
} from "../src/cloud-vision/contract";
import {
  MODEL_KEYS,
  TOKEN_RESERVATION,
  quotaDay,
} from "../src/cloud-vision/server/policy";
import assert from "node:assert/strict";
loadEnvConfig(process.cwd());
async function main() {
  const started = performance.now();
  let stage = "preflight";
  let stageStarted = started;
  const stages: { stage: string; durationMs: number }[] = [];
  const mark = (next: string) => {
    const now = performance.now();
    stages.push({ stage, durationMs: Math.round(now - stageStarted) });
    stage = next;
    stageStarted = now;
  };
  if (
    process.argv[2] !== "--run" ||
    !verifiedUntil(process.env.CLOUD_AI_GEMINI_FREE_UNTIL)
  )
    throw Error("Verified free billing and explicit --run are required.");
  const origin = new URL(process.env.CLOUD_AI_ORIGIN ?? "");
  if (
    !["127.0.0.1", "localhost"].includes(origin.hostname) ||
    process.env.VERCEL
  )
    throw Error(
      "Run this owner-only admitted check against the local production server.",
    );
  const invitation = JSON.parse(
    await readFile(".cloud-ai/invite.json", "utf8"),
  );
  const inviteHash = createHash("sha256")
    .update(String(invitation.code))
    .digest("hex");
  if (
    inviteHash !== process.env.CLOUD_AI_OWNER_TEST_INVITE_HASH &&
    !verifiedUntil(process.env.CLOUD_AI_RELEASE_READY_UNTIL)
  )
    throw Error("The owner-test invitation must be configured first.");
  const ledger = configuredLedger(process.env, AbortSignal.timeout(120000));
  await ledger.settings();
  const day = quotaDay(await ledger.now(), "pacific");
  const before = await ledger.query(
    "SELECT scope,reserved_requests,completed_requests,failed_attempts,reserved_tokens,actual_tokens FROM usage_counters WHERE window_type='day' AND window_start=? AND scope IN (?,?)",
    [day.start, MODEL_KEYS[0], "project:gemini"],
  );
  const oldUncertain = await ledger.query(
    "SELECT id,reserved_tokens FROM request_logs WHERE outcome='uncertain'",
    [],
  );
  mark("browser_start");
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  let requestKey: string | undefined;
  let httpStatus: number | undefined;
  let errorCategory: string | undefined;
  let passed = false;
  let failedStage: string | undefined;
  let processing: unknown;
  let records: Record<string, unknown>[] = [];
  let counters: Record<string, unknown>[] = [];
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(15000);
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/cloud-vision")
        requestKey = request.headers()["x-cloud-request-id"];
    });
    mark("local_upload_and_analysis");
    await page.goto(origin.origin);
    await page
      .getByLabel("Choose image")
      .setInputFiles("tests/fixtures/phase01/quadrants.jpg");
    await page
      .getByRole("button", { name: "Analyze image", exact: true })
      .click();
    await page.getByTestId("image-dna").waitFor();
    mark("consent");
    await page
      .getByText("AI Visual Observations · optional cloud analysis", {
        exact: true,
      })
      .click();
    await page.getByLabel("Pilot access code").fill(String(invitation.code));
    await page.getByLabel(/I am 18 or older/).check();
    await page.getByLabel(/I agree to send/).check();
    const responsePromise = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/cloud-vision",
      { timeout: CLOUD_SMOKE_RESPONSE_TIMEOUT_MS },
    );
    mark("admitted_request_wait");
    await page.getByRole("button", { name: "Start Cloud AI analysis" }).click();
    const response = await responsePromise;
    httpStatus = response.status();
    mark("response_validation");
    const result = validateCloudResult(await response.json());
    processing = result.processing;
    if (result.status !== "available") {
      const safeErrors = [
        "restricted",
        "not_configured",
        "cost_unverified",
        "invalid_image",
        "invalid_request",
        "rate_limited",
        "quota_exhausted",
        "invalid_credentials",
        "model_unavailable",
        "billing_required",
        "outage",
        "timeout",
        "cancelled",
        "invalid_output",
        "safety_refusal",
      ];
      errorCategory = safeErrors.includes(result.error ?? "")
        ? result.error
        : "unknown_error";
      mark("provider_result");
      throw Error("Real admitted inference unavailable.");
    }
    mark("browser_output_validation");
    await page.getByTestId("cloud-result").waitFor();
    await expect(page.getByTestId("cloud-result")).toContainText(
      result.interpretation!.description,
    );
    mark("remote_usage_verification");
    requestKey = response.request().headers()["x-cloud-request-id"];
    records = await ledger.query(
      "SELECT r.model_key,r.outcome,r.error_category,r.duration_ms,r.reserved_tokens,r.input_tokens,r.output_tokens,r.actual_tokens,r.fallback,j.released FROM request_logs r JOIN cloud_jobs j ON j.id=r.action_id WHERE j.request_key=? AND j.client=?",
      [requestKey, inviteHash],
    );
    assert.equal(records.length, 1);
    assert.equal(records[0].model_key, result.model);
    assert.equal(records[0].outcome, "completed");
    assert.equal(records[0].released, 1);
    assert.equal(records[0].reserved_tokens, TOKEN_RESERVATION);
    assert(Number(records[0].actual_tokens) > 0);
    counters = await ledger.query(
      "SELECT scope,reserved_requests,completed_requests,failed_attempts,reserved_tokens,actual_tokens FROM usage_counters WHERE window_type='day' AND window_start=? AND scope IN (?,?)",
      [day.start, MODEL_KEYS[0], "project:gemini"],
    );
    assert.equal(counters.length, 2);
    for (const row of counters) {
      const previous = before.find((r) => r.scope === row.scope);
      assert.equal(
        Number(row.reserved_requests) -
          Number(previous?.reserved_requests ?? 0),
        1,
      );
      assert.equal(
        Number(row.completed_requests) -
          Number(previous?.completed_requests ?? 0),
        1,
      );
      assert.equal(
        Number(row.failed_attempts),
        Number(previous?.failed_attempts ?? 0),
      );
      assert.equal(
        Number(row.reserved_tokens) - Number(previous?.reserved_tokens ?? 0),
        TOKEN_RESERVATION,
      );
      assert.equal(
        Number(row.actual_tokens) - Number(previous?.actual_tokens ?? 0),
        Number(records[0].actual_tokens),
      );
    }
    for (const old of oldUncertain) {
      const unchanged = await ledger.query(
        "SELECT outcome,reserved_tokens FROM request_logs WHERE id=?",
        [String(old.id)],
      );
      assert.equal(unchanged[0]?.outcome, "uncertain");
      assert.equal(unchanged[0]?.reserved_tokens, old.reserved_tokens);
    }
    passed = true;
  } catch {
    failedStage = stage;
  } finally {
    if (!passed && requestKey) {
      try {
        records = await ledger.query(
          "SELECT r.model_key,r.outcome,r.error_category,r.duration_ms,r.reserved_tokens,r.input_tokens,r.output_tokens,r.actual_tokens,r.fallback,j.released FROM request_logs r JOIN cloud_jobs j ON j.id=r.action_id WHERE j.request_key=? AND j.client=?",
          [requestKey, inviteHash],
        );
      } catch {
        /* Missing diagnostic access never bypasses quota protection. */
      }
    }
    mark("browser_close");
    await browser.close();
    mark("finished");
    const evidence = {
      at: new Date().toISOString(),
      status: passed ? "PASS" : "FAIL",
      failedStage,
      totalDurationMs: Math.round(performance.now() - started),
      stages,
      httpStatus,
      errorCategory,
      processing,
      records,
      counters,
      realBrowserFlow: true,
      database: "Cloudflare D1",
      validatedObservationsVisible: passed,
      modelAndProjectCountersVerified: passed,
      previousUncertainReservationsPreserved: passed
        ? true
        : "Not asserted after failed flow; no refund/reset performed",
      inferenceRetried: false,
      containsCredentialsOrImageContents: false,
    };
    const file = "docs/phase-03/evidence/cloud-vision.json";
    const prior = JSON.parse(await readFile(file, "utf8"));
    prior.admittedSmokeRuns = [...(prior.admittedSmokeRuns ?? []), evidence];
    await writeFile(file, JSON.stringify(prior, null, 2) + "\n");
    console.log(JSON.stringify(evidence));
  }
  if (!passed) process.exitCode = 1;
}
void main().catch(() => {
  console.error(
    "Admitted smoke blocked or failed. Verify the documented free billing, D1, owner invitation, shared policy and local server prerequisites. No credentials were printed.",
  );
  process.exitCode = 1;
});
