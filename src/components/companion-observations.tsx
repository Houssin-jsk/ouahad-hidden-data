"use client";
import { useEffect, useRef, useState } from "react";
import {
  companionPixels,
  companionRequest,
  COMPANION_ADDRESS,
} from "@/companion/client";
import {
  validateCompanionResult,
  type CompanionResult,
} from "@/companion/contract";

export function CompanionObservations({ url }: { url: string }) {
  const [code, setCode] = useState("");
  const [connected, setConnected] = useState(false);
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<CompanionResult | null>(null);
  const session = useRef<string | null>(null);
  const operation = useRef<AbortController | null>(null);
  const active = useRef<string | null>(null);
  const generation = useRef(0);

  useEffect(
    () => () => {
      generation.current++;
      operation.current?.abort();
      const token = session.current;
      const id = active.current;
      if (token) {
        if (id) void companionRequest("cancel", { id }, token).catch(() => {});
        void companionRequest("disconnect", {}, token).catch(() => {});
      }
      session.current = null;
    },
    [url],
  );

  function cancel() {
    generation.current++;
    operation.current?.abort();
    if (session.current && active.current)
      void companionRequest(
        "cancel",
        { id: active.current },
        session.current,
      ).catch(() => {});
    active.current = null;
    setBusy(false);
    setPairing(false);
    setMessage(
      "Cancelled. Restart the model in the companion before retrying.",
    );
  }
  function disconnect() {
    cancel();
    if (session.current)
      void companionRequest("disconnect", {}, session.current).catch(() => {});
    session.current = null;
    setConnected(false);
    setAvailable(false);
    setResult(null);
    setMessage("Disconnected. Your browser analysis remains available.");
  }
  async function connect() {
    const id = ++generation.current;
    const controller = new AbortController();
    operation.current = controller;
    setPairing(true);
    setMessage("");
    try {
      const value = await companionRequest(
        "pair",
        { code: code.trim().toUpperCase() },
        null,
        controller.signal,
      );
      if (id !== generation.current) return;
      if (
        !value ||
        typeof value !== "object" ||
        !("token" in value) ||
        typeof value.token !== "string" ||
        !/^[A-Za-z0-9_-]{43}$/.test(value.token)
      )
        throw Error(
          "The companion did not return a valid short pairing session.",
        );
      session.current = value.token;
      setConnected(true);
      const enabled =
        "observationsEnabled" in value && value.observationsEnabled === true;
      setAvailable(enabled);
      setCode("");
      setMessage(
        enabled
          ? "Paired for two minutes. Choose Analyze to send the current preview."
          : "Connected, but AI observations are unavailable: this companion configuration did not pass its grounding quality gate. No image will be sent.",
      );
    } catch (error) {
      if (id === generation.current)
        setMessage(
          error instanceof Error && error.message.startsWith("Pairing")
            ? error.message
            : "Could not pair. Start the companion, approve this exact HTTPS origin, renew the code, and allow Chrome local-network access if prompted.",
        );
    } finally {
      if (id === generation.current) setPairing(false);
    }
  }
  async function analyze() {
    if (!session.current || !available) return;
    const id = ++generation.current;
    const requestId = crypto.randomUUID();
    const controller = new AbortController();
    operation.current = controller;
    active.current = requestId;
    setBusy(true);
    setResult(null);
    setMessage(
      "Preparing bounded pixels, then analyzing in the local companion…",
    );
    try {
      const image = await companionPixels(url, controller.signal);
      if (id !== generation.current) return;
      const value = await companionRequest(
        "analyze",
        { id: requestId, image },
        session.current,
        controller.signal,
      );
      if (id !== generation.current) return;
      setResult(validateCompanionResult(value));
      setMessage(
        "Local AI analysis complete. Review observations as suggestions.",
      );
    } catch (error) {
      if (id === generation.current) {
        void companionRequest(
          "cancel",
          { id: requestId },
          session.current,
        ).catch(() => {});
        setMessage(
          error instanceof Error && !/fetch|network|abort/i.test(error.message)
            ? error.message
            : "Local analysis unavailable. Check the companion and restart its model before retrying.",
        );
      }
    } finally {
      if (id === generation.current) {
        active.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <details className="companion-observations">
      <summary>Optional AI observations · local companion</summary>
      <div className="companion-body">
        <h3>A closer look at visible content.</h3>
        <p>
          Qwen3-VL runs in a separate app on your device. Your numerical browser
          analysis is already complete. Nothing is sent to the companion until
          you choose Analyze.
        </p>
        <p>
          Open the Hidden Data AI Companion, import its supported model package,
          and start the model. Approve this website’s exact HTTPS address in the
          app, then enter its one-time code below. Chrome may request
          local-network permission.
        </p>
        <p className="result-footnote">
          Windows setup and package instructions are included with the
          companion. Availability requires that separate app and model; no
          public installer has been published. Local address:{" "}
          {COMPANION_ADDRESS}.
        </p>
        {!connected ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void connect();
            }}
          >
            <label htmlFor="companion-code">
              Pairing code from the companion
            </label>
            <div className="companion-actions">
              <input
                id="companion-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                maxLength={8}
                pattern="[a-fA-F0-9]{8}"
                required
                disabled={pairing}
              />
              <button className="text-button" disabled={pairing}>
                {pairing ? "Pairing…" : "Connect companion"}
              </button>
            </div>
          </form>
        ) : (
          <div className="companion-actions">
            <button
              className="text-button"
              disabled={busy || !available}
              onClick={() => void analyze()}
            >
              {busy
                ? "Analyzing locally…"
                : result
                  ? "Analyze again with companion"
                  : "Analyze with companion"}
            </button>
            {busy && (
              <button className="text-button" onClick={cancel}>
                Cancel AI analysis
              </button>
            )}
            <button className="text-button" onClick={disconnect}>
              Disconnect companion
            </button>
          </div>
        )}
        <p className="result-footnote">
          Only a newly encoded lossless preview (maximum 1536 pixels per side)
          is sent to loopback. EXIF, GPS and filenames are excluded;
          transparency is shown on white. Pairing stays in memory and expires
          after two minutes. Cancellation unloads the model.
        </p>
        {message && (
          <p role="status" className="companion-status">
            {message}
          </p>
        )}
        {result && (
          <div className="companion-output">
            <span className="eyebrow">MODEL-GENERATED · {result.model}</span>
            <p>{result.observations.image_description}</p>
            {result.observations.scene_and_surroundings && (
              <p>{result.observations.scene_and_surroundings}</p>
            )}
            {(
              [
                ["Visible elements", result.observations.main_visible_objects],
                ["Visible details", result.observations.notable_visual_details],
                ["Uncertainties", result.observations.uncertainties],
              ] as const
            ).map(
              ([title, items]) =>
                items.length > 0 && (
                  <div key={title}>
                    <h4>{title}</h4>
                    <ul>
                      {items.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ),
            )}
            <p className="result-footnote">{result.limitations}</p>
          </div>
        )}
      </div>
    </details>
  );
}
