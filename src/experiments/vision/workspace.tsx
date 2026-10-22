"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { decodeImage, validateFile } from "@/analysis/files";
import {
  SCENE_CANDIDATES,
  type ExperimentEvent,
  type ExperimentMode,
  type ExperimentResult,
} from "./types";
import styles from "./workspace.module.css";
import { SceneResults } from "./scene-results";
import { SCENE_LIBRARY, SCENE_LIBRARY_VERSION } from "@/scene/candidates";
import {
  AUDITED_SCENE_LIBRARY,
  AUDITED_LIBRARY_VERSION,
} from "@/scene/audited-candidates";
import type { Coverage } from "@/scene/coverage";

export default function VisionEvaluation() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<ExperimentMode>("discovery");
  const [coverage, setCoverage] = useState<Coverage>("whole");
  const [result, setResult] = useState<ExperimentResult | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(-1);
  const worker = useRef<Worker | null>(null);
  const generation = useRef(0);
  const urlRef = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isDiscovery = mode === "discovery" || mode === "readiness";
  const library = mode === "readiness" ? AUDITED_SCENE_LIBRARY : SCENE_LIBRARY;
  const libraryVersion =
    mode === "readiness" ? AUDITED_LIBRARY_VERSION : SCENE_LIBRARY_VERSION;
  function release() {
    generation.current++;
    worker.current?.terminate();
    worker.current = null;
    clearTimeout(timer.current);
  }
  useEffect(
    () => () => {
      generation.current++;
      worker.current?.terminate();
      clearTimeout(timer.current);
      URL.revokeObjectURL(urlRef.current);
    },
    [],
  );
  async function select(file?: File) {
    if (!file) return;
    const wasBusy = worker.current && busy;
    if (wasBusy) release();
    else generation.current++;
    const id = generation.current;
    setBusy(false);
    setResult(null);
    setSelected(-1);
    setStatus("");
    URL.revokeObjectURL(urlRef.current);
    urlRef.current = "";
    setUrl("");
    try {
      await validateFile(file);
      if (id !== generation.current) return;
      const next = URL.createObjectURL(file);
      urlRef.current = next;
      const image = await decodeImage(next);
      image.src = "";
      if (id !== generation.current) {
        URL.revokeObjectURL(next);
        return;
      }
      setUrl(next);
    } catch (error) {
      if (id === generation.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = "";
        setStatus(
          error instanceof Error ? error.message : "Image could not be read.",
        );
      }
    }
  }
  async function run() {
    if (!url || busy) return;
    const id = ++generation.current;
    setBusy(true);
    setResult(null);
    setSelected(-1);
    setStatus("Preparing experiment");
    try {
      const image = await decodeImage(url);
      let bitmap: ImageBitmap;
      try {
        bitmap = await createImageBitmap(image);
      } finally {
        image.src = "";
      }
      if (id !== generation.current) {
        bitmap.close();
        return;
      }
      worker.current ??=
        mode === "tiny"
          ? new Worker(new URL("./tiny.worker.ts", import.meta.url))
          : mode === "places"
            ? new Worker(new URL("./places.worker.ts", import.meta.url))
            : new Worker(new URL("./evaluation.worker.ts", import.meta.url));
      worker.current.onmessage = (event: MessageEvent<ExperimentEvent>) => {
        if (id !== generation.current) return;
        if (event.data.type === "status") setStatus(event.data.message);
        else {
          clearTimeout(timer.current);
          setBusy(false);
          if (event.data.type === "result") {
            setResult(event.data.result);
            setStatus("Complete · local model outputs");
          } else {
            setStatus(event.data.message);
            release();
          }
        }
      };
      worker.current.onerror = () => {
        if (id !== generation.current) return;
        release();
        setBusy(false);
        setStatus(
          "Local worker unavailable. Main image analysis is unaffected.",
        );
      };
      timer.current = setTimeout(() => {
        if (id !== generation.current) return;
        release();
        setBusy(false);
        setStatus(
          "Experiment timed out after three minutes. Main image analysis is unaffected.",
        );
      }, 180_000);
      worker.current.postMessage({ mode, bitmap, coverage }, [bitmap]);
    } catch {
      if (id === generation.current) {
        release();
        setBusy(false);
        setStatus("Experimental image preparation failed.");
      }
    }
  }
  return (
    <main className={styles.workspace}>
      <Link href="/">← HIDDEN DATA</Link>
      <p className="eyebrow">ISOLATED RESEARCH · PHASE 03</p>
      <h1>Scene discovery.</h1>
      <p>
        Experimental WASM inference. AI is not enabled in the normal release.
        Your image stays in this browser. Model downloads come from this site;
        no image is uploaded. Detector assets ≈9.7 MB; CLIP assets ≈156 MB;
        shared runtime ≈26.9 MB, plus JavaScript. No extra presentation delay.
      </p>
      <div className={styles.controls}>
        <input
          aria-label="Experiment image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => void select(event.target.files?.[0])}
        />
        <select
          aria-label="Capability"
          value={mode}
          disabled={busy}
          onChange={(event) => {
            if (
              mode === "tiny" ||
              mode === "places" ||
              event.target.value === "tiny" ||
              event.target.value === "places"
            )
              release();
            setMode(event.target.value as ExperimentMode);
            setResult(null);
          }}
        >
          <option value="tiny">TinyCLIP · final frozen evaluation</option>
          <option value="places">Places365 · official ResNet18 export</option>
          <option value="discovery">CLIP · Scene Discovery V2</option>
          <option value="readiness">CLIP · audited readiness library</option>
          <option value="detector">YOLOS-tiny · spatial detections</option>
          <option value="scene">CLIP · candidate scene matching</option>
          <option value="baseline">
            MobileNetV4 · current central-crop baseline
          </option>
        </select>
        {isDiscovery && (
          <select
            aria-label="Image coverage"
            value={coverage}
            disabled={busy}
            onChange={(event) => {
              setCoverage(event.target.value as Coverage);
              setResult(null);
            }}
          >
            <option value="whole">Whole image</option>
            <option value="multi-crop">Whole + three diagnostic crops</option>
          </select>
        )}
        <button disabled={!url || busy} onClick={() => void run()}>
          Run experiment
        </button>
        <button
          onClick={() => {
            release();
            setBusy(false);
            setResult(null);
            setStatus("Local worker released; results discarded.");
          }}
        >
          Release model / discard
        </button>
      </div>
      <p role="status" aria-live="polite">
        {status}
      </p>
      <div className={styles.columns}>
        <div>
          {url && (
            <div className={styles.image}>
              {/* eslint-disable-next-line @next/next/no-img-element -- private local object URL */}
              <img src={url} alt="Experimental input" />
              {result?.detections.map((d, i) => (
                <button
                  key={i}
                  className={styles.overlay}
                  aria-label={`${d.label} box ${i + 1}`}
                  aria-pressed={selected === i}
                  onClick={() => setSelected(i)}
                  style={{
                    left: `${d.box.xmin * 100}%`,
                    top: `${d.box.ymin * 100}%`,
                    width: `${(d.box.xmax - d.box.xmin) * 100}%`,
                    height: `${(d.box.ymax - d.box.ymin) * 100}%`,
                  }}
                >
                  <span>
                    {d.label} {(d.score * 100).toFixed(0)}%
                  </span>
                </button>
              ))}
            </div>
          )}
          <p>
            Detector: complete image, shortest edge 512 px, longest edge at most
            1,333 px. CLIP: complete image fitted into a 224 px white square.
            Baseline: the existing 224 px central crop. Alpha is composited on
            white.
          </p>
        </div>
        <section className={styles.results} aria-label="Experimental results">
          <h2>Model evidence</h2>
          {!result ? (
            <p>No predictions until actual inference completes.</p>
          ) : (
            <>
              <dl>
                <dt>Backend / reuse</dt>
                <dd>
                  {result.backend} /{" "}
                  {result.reused ? "warm model" : "initialized model"}
                </dd>
                <dt>Initialization / preprocessing / inference</dt>
                <dd>
                  {result.initializationMs.toFixed(0)} /{" "}
                  {result.preprocessingMs.toFixed(0)} /{" "}
                  {result.inferenceMs.toFixed(0)} ms
                </dd>
                <dt>Actual tensor shape</dt>
                <dd>{result.inputShape.join(" × ")}</dd>
              </dl>
              {result.discovery ? (
                <SceneResults discovery={result.discovery} />
              ) : result.mode === "detector" ? (
                <>
                  <p>
                    COCO labels only. Threshold 25% is exploratory, not a
                    correctness guarantee. Empty results mean nothing detected
                    above threshold; they do not prove objects are absent.
                  </p>
                  <ol>
                    {result.detections.map((d, i) => (
                      <li key={i}>
                        <button onClick={() => setSelected(i)}>
                          {d.label} · {(d.score * 100).toFixed(1)}%
                        </button>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <>
                  <p>
                    {result.mode === "tiny"
                      ? "Research cosine similarities among supplied descriptions; not correctness probabilities or ImageNet labels."
                      : result.mode === "scene"
                        ? "Relative scores among the ten supplied descriptions. Changing that list changes the scores. This is candidate matching, not a generated caption or a calibrated probability of the scene."
                        : result.mode === "places"
                          ? "Places365 full-taxonomy softmax scores, not correctness probabilities. Research only."
                          : "ImageNet classification scores; unrelated labels can win for unfamiliar scenes."}
                  </p>
                  <ol>
                    {result.predictions.map((p) => (
                      <li key={p.label}>
                        {p.label} ·{" "}
                        {result.mode === "tiny"
                          ? p.score.toFixed(4)
                          : `${(p.score * 100).toFixed(1)}%`}
                      </li>
                    ))}
                  </ol>
                </>
              )}
              <details>
                <summary>Raw output and timings</summary>
                <pre data-testid="experiment-result">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </>
          )}
          {mode === "scene" && (
            <details>
              <summary>Exact candidate descriptions</summary>
              <ul>
                {SCENE_CANDIDATES.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            </details>
          )}
          {isDiscovery && (
            <details>
              <summary>Frozen candidate library</summary>
              <p>{libraryVersion} · six candidates in each of six themes</p>
              <ul>
                {library.map((candidate) => (
                  <li key={candidate.id}>
                    {candidate.theme} · {candidate.description}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      </div>
    </main>
  );
}
