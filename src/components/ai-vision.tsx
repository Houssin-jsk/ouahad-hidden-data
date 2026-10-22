"use client";
import { useEffect, useRef, useState } from "react";
import type { AnalysisResult, ImageSource } from "@/analysis/types";
import { imageDNA } from "@/analysis/dna";
import { decodeImage } from "@/analysis/files";
import {
  UNCERTAIN_SCORE,
  VISION_STAGES,
  type VisionEvent,
  type VisionResult,
  type VisionStage,
} from "@/ai/types";

export default function AIVision({
  source,
  measured,
}: {
  source: ImageSource;
  measured: AnalysisResult;
}) {
  const [result, setResult] = useState<VisionResult | null>(null);
  const [stage, setStage] = useState<VisionStage | null>(null);
  const [detail, setDetail] = useState("");
  const [download, setDownload] = useState<{
    file: string;
    loaded: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState("");
  const [preferWasm, setPreferWasm] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);
  const generation = useRef(0);
  const busyRef = useRef(false);
  useEffect(
    () => () => {
      generation.current++;
      cancelRef.current?.();
    },
    [],
  );

  async function run() {
    if (busyRef.current) return;
    const id = ++generation.current;
    busyRef.current = true;
    setStage("preparing");
    setError("");
    setResult(null);
    setDownload(null);
    setDetail("");
    try {
      if (
        !window.Worker ||
        !window.WebAssembly ||
        !window.createImageBitmap ||
        !window.OffscreenCanvas
      )
        throw new Error("unsupported");
      const { runVision } = await import("@/ai/client");
      const image = await decodeImage(source.url);
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
      cancelRef.current = runVision(
        bitmap,
        (event: VisionEvent) => {
          if (id !== generation.current) return;
          if (event.type === "stage") {
            setStage(event.stage);
            setDetail(event.detail ?? "");
            setDownload(null);
          } else if (event.type === "download") setDownload(event);
          else {
            busyRef.current = false;
            setStage(null);
            cancelRef.current = null;
            if (event.type === "result") setResult(event.result);
            else setError(event.message);
          }
        },
        preferWasm,
      );
    } catch {
      if (id !== generation.current) return;
      busyRef.current = false;
      setStage(null);
      setError(
        "Local AI could not start. Use a current browser with WebAssembly, image decoding and worker canvas support. Pixel analysis remains available.",
      );
    }
  }
  function cancel() {
    generation.current++;
    cancelRef.current?.();
    cancelRef.current = null;
    busyRef.current = false;
    setStage(null);
    setDownload(null);
    setDetail(
      "Result discarded and local worker released. GPU commands already submitted may finish in the graphics driver.",
    );
  }
  const uncertain = result && result.predictions[0].score < UNCERTAIN_SCORE;
  return (
    <section className="ai-vision" aria-label="AI Vision">
      <div className="result-title">
        <span className="eyebrow">ON-DEVICE CLASSIFICATION</span>
        <h2>What the model sees.</h2>
        <p>
          A second lens on your image. MobileNetV4 compares a central crop with
          1,000 ImageNet classes.
        </p>
      </div>
      {!result && !stage && (
        <label className="ai-compatibility">
          <input
            type="checkbox"
            checked={preferWasm}
            onChange={(event) => setPreferWasm(event.target.checked)}
          />{" "}
          Use CPU compatibility mode
        </label>
      )}
      {!result && !stage && (
        <button className="ai-run" onClick={() => void run()}>
          {error ? "Retry AI Vision" : "Run AI Vision"}{" "}
          <span aria-hidden="true">↗</span>
        </button>
      )}
      {stage && (
        <div className="ai-processing" aria-busy="true">
          <ol className="ai-stages" aria-label="AI processing stages">
            {Object.entries(VISION_STAGES).map(([key, label]) => (
              <li key={key} data-active={stage === key}>
                {label}
              </li>
            ))}
          </ol>
          <div role="status">
            <strong>{VISION_STAGES[stage]}</strong>
            <p>{detail}</p>
            {download && (
              <>
                <p>
                  {download.file.split("/").pop()} ·{" "}
                  {(download.loaded / 1e6).toFixed(1)} /{" "}
                  {(download.total / 1e6).toFixed(1)} MB
                </p>
                <progress
                  aria-label={`Downloading ${download.file}`}
                  value={download.loaded}
                  max={download.total}
                />
              </>
            )}
          </div>
          <button className="ai-cancel" onClick={cancel}>
            Discard AI analysis
          </button>
        </div>
      )}
      {error && (
        <p className="ai-error" role="alert">
          {error}
        </p>
      )}
      {!stage && !error && !result && detail && (
        <p role="status" className="result-footnote">
          {detail}
        </p>
      )}
      {result && (
        <>
          <p className="ai-verdict">
            {uncertain ? "Uncertain classification" : "Top model suggestion"} ·{" "}
            <strong>{result.predictions[0].label}</strong>
          </p>
          {uncertain && (
            <p className="result-footnote">
              Top score below 50%. This is a product caution threshold, not a
              calibrated accuracy boundary.
            </p>
          )}
          <ol className="ai-predictions">
            {result.predictions.map((p) => (
              <li key={p.label}>
                <div>
                  <span>{p.label}</span>
                  <strong>{(p.score * 100).toFixed(1)}%</strong>
                </div>
                <div className="ai-score-track" aria-hidden="true">
                  <i style={{ width: `${p.score * 100}%` }} />
                </div>
              </li>
            ))}
          </ol>
          <p className="result-footnote">
            Softmax scores across all 1,000 supported classes, not guarantees of
            correctness. The top five do not necessarily add up to 100%.
          </p>
          <div className="ai-dna">
            <span className="eyebrow">MEASURED IMAGE DNA</span>
            <p>{imageDNA(measured, source)}</p>
            <span className="eyebrow">SEPARATE MODEL SUGGESTION</span>
            <p>
              {result.predictions[0].label} ·{" "}
              {(result.predictions[0].score * 100).toFixed(1)}% model score
              {uncertain ? " · uncertain" : ""}
            </p>
          </div>
          <p className="result-footnote">
            {result.backend === "webgpu"
              ? "WebGPU session (some operations may use WASM)"
              : "WASM · local CPU"}{" "}
            ·{" "}
            {result.reused
              ? "Model reused"
              : `Initialization ${(result.initializationMs / 1000).toFixed(1)} s`}{" "}
            · inference {(result.inferenceMs / 1000).toFixed(2)} s.
          </p>
          <button className="ai-cancel" onClick={() => void run()}>
            Run again
          </button>
        </>
      )}
      <div className="ai-method">
        <h3>A suggestion, with limits.</h3>
        <p>
          Its training vocabulary is limited. Unfamiliar scenes and culturally
          specific objects may be misclassified. A prediction does not establish
          an object’s presence, find every object or locate it in the image.
        </p>
        <p>
          The model sees a 224 × 224 central crop with ImageNet RGB
          normalization; transparent areas are composited on white. Browser
          resizing can affect scores. Pixel statistics above use their own
          native-pixel, alpha-weighted method.
        </p>
      </div>
      <p className="sample-note">
        Your image stays in your browser. First use downloads about 42.1 MB of
        model and runtime assets from this site, plus JavaScript. Downloading a
        model is different from uploading an image. No image, EXIF or GPS data
        is sent. Assets may remain in your browser’s HTTP cache; images and
        predictions are not saved.
      </p>
    </section>
  );
}
