"use client";
import { useEffect, useRef, useState } from "react";
import {
  validateAvailability,
  type CloudAvailability,
} from "@/cloud-vision/availability";
import { prepareCloudImage } from "@/cloud-vision/client";
import {
  CLOUD_BROWSER_TIMEOUT_MS,
  validateCloudResult,
  type CloudResult,
} from "@/cloud-vision/contract";

function failureMessage(error: CloudResult["error"]) {
  const messages: Partial<Record<NonNullable<CloudResult["error"]>, string>> = {
    restricted: "AI admission is unavailable for this request.",
    rate_limited:
      "AI request rejected: the shared fair-use or concurrency limit was reached. Check availability later.",
    quota_exhausted:
      "AI request rejected: the available quota is exhausted. Check availability later.",
    timeout:
      "AI request timed out. The provider may still have processed the image; no automatic retry was sent.",
    outage:
      "The AI connection failed. The provider may have received the image; no automatic retry was sent.",
    safety_refusal:
      "The provider declined this image. No AI observations were generated.",
    invalid_output:
      "The provider returned an invalid response. No AI observations are shown.",
    invalid_image: "The processed image was rejected. Try a different image.",
    cancelled:
      "AI analysis cancelled. An already sent image may have reached the provider.",
  };
  return `${messages[error ?? "not_configured"] ?? "AI request rejected: AI observations are paused or unavailable."} Your local results remain available.`;
}

async function availability(signal: AbortSignal) {
  const response = await fetch("/api/cloud-vision/status", {
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.any([signal, AbortSignal.timeout(6000)]),
  });
  const value = validateAvailability(await response.json());
  return response.ok || value === "invalid_invitation" ? value : "unavailable";
}

export function CloudObservations({ url }: { url: string }) {
  const [access, setAccess] = useState<CloudAvailability | "checking">(
    "checking",
  );
  const accessOperation = useRef<AbortController | null>(null);
  const accessNotice = useRef<HTMLParagraphElement>(null);
  const [consent, setConsent] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<CloudResult | null>(null);
  const generation = useRef(0);
  const operation = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    accessOperation.current = controller;
    void availability(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setAccess(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setAccess("unavailable");
      });
    return () => controller.abort();
  }, []);
  async function checkAccess() {
    if (operation.current && !operation.current.signal.aborted) return;
    accessOperation.current?.abort();
    const controller = new AbortController();
    accessOperation.current = controller;
    setAccess("checking");
    setConsent(false);
    setEligible(false);
    try {
      const value = await availability(controller.signal);
      if (!controller.signal.aborted) {
        setAccess(value);
        accessNotice.current?.focus({ preventScroll: true });
      }
    } catch {
      if (!controller.signal.aborted) {
        setAccess("unavailable");
        accessNotice.current?.focus({ preventScroll: true });
      }
    }
  }
  useEffect(
    () => () => {
      generation.current++;
      operation.current?.abort();
      accessOperation.current?.abort();
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
      access !== "eligible" ||
      !consent ||
      !eligible ||
      busy ||
      result?.status === "available" ||
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
          "x-cloud-consent": "external-v1",
          "x-cloud-request-id": crypto.randomUUID(),
          "x-cloud-eligibility": "adult-professional-nonsensitive-v2",
        },
        body: image,
        signal: controller.signal,
        credentials: "same-origin",
        cache: "no-store",
      });
      const value = validateCloudResult(await response.json());
      if (!response.ok && value.status === "available")
        throw Error("Invalid response status");
      if (id !== generation.current) return;
      setResult(value);
      if (value.status === "unavailable") {
        if (value.error === "restricted") setAccess("invalid_invitation");
        else if (
          [
            "not_configured",
            "cost_unverified",
            "invalid_credentials",
            "billing_required",
            "model_unavailable",
            "rate_limited",
            "quota_exhausted",
            "timeout",
            "outage",
          ].includes(value.error ?? "")
        )
          setAccess("unavailable");
      }
      setMessage(
        value.status === "available"
          ? "AI observations ready. Review them as an interpretation."
          : failureMessage(value.error),
      );
    } catch {
      if (id === generation.current) {
        setAccess("unavailable");
        setMessage(
          controller.signal.aborted
            ? "AI request timed out. An already sent image may have reached the provider."
            : "Cloud AI is unavailable. The image may have reached the provider; no automatic retry was sent. Local analysis remains available.",
        );
      }
    } finally {
      clearTimeout(timer);
      if (id === generation.current) {
        operation.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <section
      className="cloud-observations"
      aria-labelledby="cloud-title"
      aria-busy={busy}
    >
      <div className="cloud-heading">
        <h3 id="cloud-title">AI Visual Observations</h3>
        <span>Experimental</span>
      </div>
      <p className="cloud-intro">
        Explore what the image appears to show, beyond its pixel measurements.
      </p>
      {message && (
        <p role="status" className="cloud-status">
          {message}
        </p>
      )}
      {access === "unavailable" && (
        <button className="text-button" onClick={() => void checkAccess()}>
          Check availability
        </button>
      )}
      <p
        ref={accessNotice}
        tabIndex={-1}
        className="cloud-availability"
        role="status"
      >
        {access === "checking"
          ? "Checking current availability…"
          : access === "unavailable"
            ? "AI observations are currently unavailable. Your local results are complete."
            : access === "eligible"
              ? "AI available. Review the image and consent below before requesting observations."
              : access === "invalid_invitation"
                ? "AI admission is unavailable."
                : "AI observations are currently unavailable."}
      </p>
      {access === "eligible" && (
        <div className="cloud-body">
          {access === "eligible" && (
            <>
              <p>
                AI interpretation may be wrong. It is separate from your
                measured image facts. Availability is checked again when you
                start.
              </p>
              <p id="cloud-disclosure">
                Starting sends a resized copy to Google Gemini, or an eligible
                fallback if needed. Google’s free service may use images and
                responses to improve its products, including human review.
                Cloudflare applies its own data terms. Hidden Data does not save
                the image. Do not send personal, sensitive or confidential
                images.
              </p>
              <p className="result-footnote">
                Only a newly encoded JPEG, at most 1024 pixels per side, leaves
                this browser. EXIF, GPS and filenames are excluded; transparency
                appears on white. Providers are contacted one at a time.
                Cancellation cannot recall data already received.
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
              <label className="cloud-check">
                <input
                  type="checkbox"
                  checked={eligible}
                  onChange={(e) => setEligible(e.target.checked)}
                  disabled={busy}
                />{" "}
                I am 18 or older, using this service for professional or
                business purposes, and this image contains no personal,
                sensitive or confidential information.
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
                    busy ||
                    result?.status === "available" ||
                    access !== "eligible" ||
                    !consent ||
                    !eligible
                  }
                  onClick={() => void analyze()}
                >
                  {busy
                    ? "Analyzing with Cloud AI…"
                    : result?.status === "available"
                      ? "AI observations ready"
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
                    This AI-generated interpretation may contain mistakes. It
                    does not verify identity, location or authenticity.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
