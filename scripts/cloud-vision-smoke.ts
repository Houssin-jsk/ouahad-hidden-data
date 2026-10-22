// Explicit, one-image evaluation only; never imported by the application.
// Requires current free-account attestation; does not bypass cost eligibility.
import { loadEnvConfig } from "@next/env";
import { readFile, writeFile } from "node:fs/promises";
import { geminiAdapter } from "../src/cloud-vision/server/providers/gemini";
import { validateCloudImage } from "../src/cloud-vision/server/image";
import { verifiedUntil } from "../src/cloud-vision/server/config";
import {
  MAX_IMAGE_BYTES,
  MAX_IMAGE_SIDE,
  OUTPUT_TOKENS,
} from "../src/cloud-vision/contract";
loadEnvConfig(process.cwd());
async function main() {
  if (
    process.argv[2] !== "--evaluation" ||
    !process.env.GEMINI_API_KEY ||
    !verifiedUntil(process.env.CLOUD_AI_GEMINI_FREE_UNTIL)
  )
    throw Error(
      "Explicit evaluation, an existing Gemini credential and verified free billing are required.",
    );
  const image = validateCloudImage(
    new Uint8Array(await readFile("tests/fixtures/phase01/quadrants.jpg")),
    "image/jpeg",
  );
  const model = process.argv[3] ?? "gemini-3.5-flash-lite";
  if (model !== "gemini-3.5-flash-lite" && model !== "gemini-3.1-flash-lite")
    throw Error("Model is not in the approved registry.");
  const adapter = geminiAdapter(
    process.env.GEMINI_API_KEY,
    {
      enabled: true,
      reason: "Single explicit evaluation, not production eligibility",
    },
    {
      mime: "image/jpeg",
      maxBytes: MAX_IMAGE_BYTES,
      maxSide: MAX_IMAGE_SIDE,
      outputTokens: OUTPUT_TOKENS,
    },
    model,
  );
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = async (...args) => {
    const response = await nativeFetch(...args);
    if (!response.ok) {
      const value = await response
        .clone()
        .json()
        .catch(() => ({}));
      const text = String(value.error?.message ?? "")
        .replaceAll(process.env.GEMINI_API_KEY!, "[redacted]")
        .replace(/[A-Za-z0-9+/=_-]{80,}/g, "[redacted]")
        .slice(0, 300);
      console.log(
        JSON.stringify({
          evaluationHttpStatus: response.status,
          errorStatus: value.error?.status,
          diagnostic: text,
        }),
      );
    }
    return response;
  };
  try {
    const start = Date.now();
    const response = await adapter.run(image, AbortSignal.timeout(15000));
    const evidence = {
      at: new Date().toISOString(),
      realInference: true,
      provider: adapter.id,
      model: adapter.model,
      fixture: "synthetic black/white/gray/red quadrants",
      image: {
        width: image.width,
        height: image.height,
        bytes: image.bytes.length,
      },
      elapsedMs: Date.now() - start,
      response,
      billingSafety:
        "Operator-attested free account; this adapter evaluation does not certify admitted production readiness or invoice attribution.",
      grounding:
        "EXPERIMENTAL: synthetic smoke is not held-out quality qualification",
    };
    const prior = JSON.parse(
      await readFile("docs/phase-03/evidence/cloud-vision.json", "utf8").catch(
        () => "{}",
      ),
    );
    await writeFile(
      "docs/phase-03/evidence/cloud-vision.json",
      JSON.stringify(
        {
          ...prior,
          finalizationSmokeHistory: [
            ...(prior.finalizationSmokeHistory ?? []),
            evidence,
          ],
        },
        null,
        2,
      ) + "\n",
    );
    console.log(JSON.stringify(evidence));
  } catch (error) {
    console.log(
      JSON.stringify({
        realInference: false,
        error:
          error instanceof Error && /^[a-z_]+$/.test(error.message)
            ? error.message
            : "evaluation_failed",
      }),
    );
    process.exitCode = 1;
  } finally {
    image.bytes.fill(0);
    globalThis.fetch = nativeFetch;
  }
}
void main().catch(() => {
  console.log("Evaluation setup failed.");
  process.exitCode = 1;
});
