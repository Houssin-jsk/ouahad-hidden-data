"use client";
import { useEffect, useRef, useState } from "react";
import { prepareCloudImage } from "@/cloud-vision/client";
import {
  CLOUD_BROWSER_TIMEOUT_MS,
  validateCloudResult,
  type CloudResult,
} from "@/cloud-vision/contract";

export function CloudObservations({ url }: { url: string }) {
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<CloudResult | null>(null);
  const generation = useRef(0);
  const operation = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      generation.current++;
      operation.current?.abort();
    },
    [url],
  );
  function cancel() {
    generation.current++;
    operation.current?.abort();
    setBusy(false);
    setMessage(
      "AI analysis cancelled. An already sent image may have reached the provider.",
    );
  }
  async function analyze() {
    if (
      !consent ||
      !eligible ||
      !/^[A-Za-z0-9_-]{43}$/.test(code) ||
      busy ||
      (operation.current && !operation.current.signal.aborted)
    )
      return;
    const id = ++generation.current;
    const controller = new AbortController();
    operation.current = controller;
    const timer = window.setTimeout(
      () => controller.abort(),
      CLOUD_BROWSER_TIMEOUT_MS,
    );
    setBusy(true);
    setResult(null);
    setMessage(
      "Preparing a metadata-free preview, then analyzing visible content…",
    );
    try {
      const image = await prepareCloudImage(url, controller.signal);
      if (id !== generation.current) return;
      const response = await fetch("/api/cloud-vision", {
        method: "POST",
        headers: {
          "content-type": "image/jpeg",
          authorization: `Bearer ${code}`,
          "x-cloud-consent": "external-v1",
          "x-cloud-request-id": crypto.randomUUID(),
          "x-cloud-eligibility": "adult-ma-professional-nonsensitive-v1",
        },
        body: image,
        signal: controller.signal,
        credentials: "same-origin",
        cache: "no-store",
      });
      const value = validateCloudResult(await response.json());
      if (id !== generation.current) return;
      setResult(value);
      setMessage(
        value.status === "available"
          ? "AI observations ready. Review them as an interpretation."
          : (value.message ?? "Cloud AI is temporarily unavailable."),
      );
    } catch {
      if (id === generation.current)
        setMessage(
          controller.signal.aborted
            ? "AI request timed out. An already sent image may have reached the provider."
            : "Cloud AI is unavailable. Try again later; local analysis remains available.",
        );
    } finally {
      clearTimeout(timer);
      if (id === generation.current) {
        operation.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <details className="cloud-observations">
      <summary>AI Visual Observations · optional cloud analysis</summary>
      <div className="cloud-body">
        <h3>A closer look at visible content.</h3>
        <p>
          Experimental AI interpretation, separate from your measured image
          facts. Cloud access is currently a restricted professional pilot.
        </p>
        <p id="cloud-disclosure">
          Starting sends a resized copy to Google Gemini, or an eligible
          fallback if needed. Google’s free service may use images and responses
          to improve its products, including human review. Cloudflare applies
          its own data terms. Hidden Data does not save the image. Do not send
          personal, sensitive or confidential images.
        </p>
        <p className="result-footnote">
          Only a newly encoded JPEG, at most 1024 pixels per side, leaves this
          browser. EXIF, GPS and filenames are excluded; transparency appears on
          white. Providers are contacted one at a time. Cancellation cannot
          recall data already received.
        </p>
        <p className="result-footnote">
          <a
            href="https://ai.google.dev/gemini-api/terms"
            target="_blank"
            rel="noreferrer"
          >
            Google data terms ↗
          </a>
          {" · "}
          <a
            href="https://developers.cloudflare.com/workers-ai/platform/data-usage/"
            target="_blank"
            rel="noreferrer"
          >
            Cloudflare data terms ↗
          </a>
        </p>
        <label htmlFor="cloud-access">Pilot access code</label>
        <input
          id="cloud-access"
          type="password"
          autoComplete="off"
          spellCheck={false}
          maxLength={43}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={busy}
        />
        <label className="cloud-check">
          <input
            type="checkbox"
            checked={eligible}
            onChange={(e) => setEligible(e.target.checked)}
            disabled={busy}
          />{" "}
          I am 18 or older, currently in Morocco, using this professional pilot,
          and this image contains no personal, sensitive or confidential
          information.
        </label>
        <label className="cloud-check">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            disabled={busy}
            aria-describedby="cloud-disclosure"
          />{" "}
          I agree to send this processed image to an external AI provider.
        </label>
        <div className="cloud-actions">
          <button
            className="text-button"
            disabled={
              busy || !consent || !eligible || !/^[A-Za-z0-9_-]{43}$/.test(code)
            }
            onClick={() => void analyze()}
          >
            {busy
              ? "Analyzing with Cloud AI…"
              : result
                ? "Retry Cloud AI"
                : "Start Cloud AI analysis"}
          </button>
          {busy && (
            <button className="text-button" onClick={cancel}>
              Cancel AI analysis
            </button>
          )}
        </div>
        {message && (
          <p role="status" className="cloud-status">
            {message}
          </p>
        )}
        {result?.status === "available" && result.interpretation && (
          <div className="cloud-output" data-testid="cloud-result">
            <span className="eyebrow">AI-GENERATED · EXPERIMENTAL</span>
            <p>{result.interpretation.description}</p>
            {result.interpretation.observations.length > 0 && (
              <ul>
                {result.interpretation.observations.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            )}
            <h4>Limitations and uncertainty</h4>
            <ul>
              {result.interpretation.limitations.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
            <p className="result-footnote">
              This AI-generated interpretation may contain mistakes. It does not
              verify identity, location or authenticity.
            </p>
          </div>
        )}
      </div>
    </details>
  );
}
