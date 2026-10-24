"use client";

import { useEffect, useRef, useState } from "react";
import BrandImage from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronRight,
  ImagePlus,
  LockKeyhole,
  RotateCcw,
  ScanLine,
} from "lucide-react";
import { decodeImage, validateFile } from "@/analysis/files";
import type { AnalysisResult, ImageSource } from "@/analysis/types";
import { Results } from "./results";
import { fileSize } from "@/lib/format";
import type { AnalysisStage } from "@/analysis/discovery-types";
import { SpatialPreview, type MapUrls } from "./spatial-preview";
import { AnalysisLoading } from "./analysis-loading";
import {
  createLoadingRun,
  type LoadingRun,
  type LoadingFrame,
} from "@/loading/presentation";

export function ImageLab() {
  const [source, setSource] = useState<ImageSource | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [stage, setStage] = useState<AnalysisStage>("idle");
  const [mapUrls, setMapUrls] = useState<MapUrls | null>(null);
  const [notice, setNotice] = useState("");
  const [loadingFrame, setLoadingFrame] = useState<LoadingFrame | null>(null);
  const presentation = useRef<LoadingRun<AnalysisResult> | null>(null);
  const resultsPanel = useRef<HTMLDivElement>(null);
  const focusResults = useRef(false);
  useEffect(() => {
    if (result && focusResults.current) {
      const tab = resultsPanel.current?.querySelector<HTMLButtonElement>(
        '[role="tab"][aria-selected="true"]',
      );
      tab?.focus({ preventScroll: true });
      if (tab)
        window.scrollTo({
          top: Math.max(
            0,
            window.scrollY +
              tab.getBoundingClientRect().top -
              window.innerHeight * 0.25,
          ),
          behavior: "auto",
        });
      focusResults.current = false;
    }
  }, [result]);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const url = useRef<string | null>(null);
  const worker = useRef<Worker | null>(null);
  const generation = useRef(0);
  const decoding = useRef<AbortController | null>(null);
  const analysisTimeout = useRef<number | null>(null);
  const selectedFile = useRef<File | null>(null);
  const retainedMapUrls = useRef<string[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const [sticky, setSticky] = useState(false);
  useEffect(() => {
    if (notice)
      panelRef.current
        ?.querySelector<HTMLButtonElement>(".analyze-button")
        ?.focus();
  }, [notice]);
  useEffect(() => {
    const element = panelRef.current;
    if (!element) return;
    const update = () =>
      setSticky(
        window.innerWidth > 820 &&
          element.getBoundingClientRect().height < window.innerHeight - 40,
      );
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("resize", update);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);
  useEffect(
    () => () => {
      generation.current++;
      decoding.current?.abort();
      presentation.current?.cancel();
      worker.current?.terminate();
      if (analysisTimeout.current) clearTimeout(analysisTimeout.current);
      if (url.current) URL.revokeObjectURL(url.current);
      retainedMapUrls.current.forEach((value) => URL.revokeObjectURL(value));
    },
    [],
  );

  function clear() {
    focusResults.current = false;
    generation.current++;
    decoding.current?.abort();
    decoding.current = null;
    presentation.current?.cancel();
    presentation.current = null;
    setLoadingFrame(null);
    worker.current?.terminate();
    worker.current = null;
    if (analysisTimeout.current) clearTimeout(analysisTimeout.current);
    analysisTimeout.current = null;
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    retainedMapUrls.current.forEach((value) => URL.revokeObjectURL(value));
    retainedMapUrls.current = [];
    selectedFile.current = null;
    setMapUrls(null);
    setNotice("");
    setSource(null);
    setResult(null);
    setError("");
    setStage("idle");
  }
  async function select(file: File) {
    clear();
    const id = generation.current;
    setStage("decoding");
    try {
      const format = await validateFile(file);
      if (id !== generation.current) return;
      const nextUrl = URL.createObjectURL(file);
      url.current = nextUrl;
      const controller = new AbortController();
      decoding.current = controller;
      const image = await decodeImage(nextUrl, controller.signal);
      if (id !== generation.current) {
        image.src = "";
        return;
      }
      setSource({
        url: nextUrl,
        name: file.name,
        width: image.naturalWidth,
        height: image.naturalHeight,
        size: file.size,
        format,
      });
      selectedFile.current = file;
      image.src = "";
      setStage("idle");
    } catch (e) {
      if (id === generation.current) {
        if (url.current) URL.revokeObjectURL(url.current);
        url.current = null;
        setError(e instanceof Error ? e.message : "Unable to open image.");
        setStage("idle");
      }
    }
  }
  async function analyze() {
    if (!source || !selectedFile.current || stage !== "idle") return;
    const id = generation.current;
    setError("");
    setNotice("");
    setStage("decoding");
    presentation.current = createLoadingRun<AnalysisResult>({
      onFrame(frame) {
        if (id === generation.current) setLoadingFrame(frame);
      },
      onReady(result) {
        if (id !== generation.current) return;
        focusResults.current = true;
        if (result.maps) {
          const light =
              retainedMapUrls.current[0] ??
              URL.createObjectURL(result.maps.light),
            detail =
              retainedMapUrls.current[1] ??
              URL.createObjectURL(result.maps.detail);
          retainedMapUrls.current = [light, detail];
          setMapUrls({ light, detail });
        }
        setResult(result);
        setStage("idle");
        setLoadingFrame(null);
        presentation.current = null;
      },
    });
    try {
      const controller = new AbortController();
      decoding.current = controller;
      const image = await decodeImage(source.url, controller.signal);
      if (id !== generation.current) {
        image.src = "";
        return;
      }
      if (
        typeof createImageBitmap !== "function" ||
        typeof OffscreenCanvas === "undefined"
      ) {
        image.src = "";
        throw new Error(
          "Native pixel analysis requires a browser with ImageBitmap and OffscreenCanvas support.",
        );
      }
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
      let nextWorker: Worker;
      try {
        nextWorker = new Worker(
          new URL("../analysis/analysis.worker.ts", import.meta.url),
        );
      } catch (error) {
        bitmap.close();
        throw error;
      }
      worker.current = nextWorker;
      setStage("sampling");
      presentation.current?.update("sampling");
      const timeout = window.setTimeout(() => {
        nextWorker.terminate();
        if (id === generation.current) {
          worker.current = null;
          analysisTimeout.current = null;
          presentation.current?.cancel();
          presentation.current = null;
          setLoadingFrame(null);
          setStage("idle");
          setError("Analysis timed out. Please try again.");
        }
      }, 20000);
      analysisTimeout.current = timeout;
      nextWorker.onmessage = (
        event: MessageEvent<{
          result?: AnalysisResult;
          error?: string;
          stage?: AnalysisStage;
        }>,
      ) => {
        if (event.data.stage) {
          if (id === generation.current) {
            setStage(event.data.stage);
            presentation.current?.update(event.data.stage);
          }
          return;
        }
        clearTimeout(timeout);
        nextWorker.terminate();
        if (id !== generation.current) return;
        worker.current = null;
        analysisTimeout.current = null;
        if (event.data.result) {
          presentation.current?.complete(event.data.result);
        } else {
          presentation.current?.cancel();
          presentation.current = null;
          setLoadingFrame(null);
          setError(event.data.error ?? "Analysis failed.");
          setStage("idle");
        }
      };
      nextWorker.onerror = () => {
        clearTimeout(timeout);
        nextWorker.terminate();
        if (id === generation.current) {
          worker.current = null;
          analysisTimeout.current = null;
          presentation.current?.cancel();
          presentation.current = null;
          setLoadingFrame(null);
          setError(
            "Analysis could not run in this browser. Please try a modern browser.",
          );
          setStage("idle");
        }
      };
      try {
        nextWorker.postMessage({ bitmap, file: selectedFile.current }, [
          bitmap,
        ]);
      } catch (error) {
        bitmap.close();
        nextWorker.terminate();
        clearTimeout(timeout);
        throw error;
      }
    } catch (e) {
      if (id === generation.current) {
        worker.current = null;
        analysisTimeout.current = null;
        presentation.current?.cancel();
        presentation.current = null;
        setLoadingFrame(null);
        setError(e instanceof Error ? e.message : "Analysis failed.");
        setStage("idle");
      }
    }
  }
  const busy = stage !== "idle";
  function cancel() {
    retainedMapUrls.current.forEach((value) => URL.revokeObjectURL(value));
    retainedMapUrls.current = [];
    generation.current++;
    decoding.current?.abort();
    decoding.current = null;
    presentation.current?.cancel();
    presentation.current = null;
    setLoadingFrame(null);
    worker.current?.terminate();
    worker.current = null;
    if (analysisTimeout.current) clearTimeout(analysisTimeout.current);
    analysisTimeout.current = null;
    setStage("idle");
    setNotice("Analysis cancelled. You can analyze this image again.");
  }
  return (
    <div className={`app-shell ${source ? "has-image" : ""}`}>
      <header className="site-header">
        <Link className="identity" href="/" aria-label="Hidden Data home">
          <BrandImage
            src="/brand/logo_black.png"
            alt="OUAHAD SPACE"
            width={52}
            height={52}
            unoptimized
            priority
          />
          <span>
            <strong>
              HIDDEN DATA<span className="identity-dot">.</span>
            </strong>
            <small>by OUAHAD SPACE</small>
          </span>
        </Link>
        <div className="header-right">
          <span className="local-badge">
            <span /> LOCAL BY DESIGN
          </span>
          <a
            href="#method"
            onClick={() => {
              const method = document.getElementById(
                "method",
              ) as HTMLDetailsElement | null;
              if (method) method.open = true;
            }}
          >
            How it works
          </a>
        </div>
      </header>
      <main>
        <section className="intro">
          <div>
            <div className="eyebrow">
              <span className="tiny-line" /> A closer look at your images
            </div>
            <h1>
              Color you can use.
              <br /> <span>Light you can understand.</span>
            </h1>
            <p>
              Take a palette into your next design. Explore the light. See what
              the file reveals.
            </p>
          </div>
        </section>
        <ol className="workflow" aria-label="Analysis steps">
          {["Select image", "Analyze", "Explore"].map((label, i) => (
            <li
              key={label}
              className={
                (i === 0 && !source) ||
                (i === 1 && source && !result) ||
                (i === 2 && result)
                  ? "step active"
                  : (i === 0 && source) || (i === 1 && result)
                    ? "step completed"
                    : "step"
              }
            >
              <span>
                {(i === 0 && source) || (i === 1 && result) ? (
                  <Check size={12} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              {label}
              {i < 2 && <ChevronRight className="step-chevron" size={14} />}
            </li>
          ))}
        </ol>
        <section className="lab" aria-label="Image analysis workspace">
          <div
            ref={panelRef}
            className={`image-workspace ${sticky ? "fits-viewport" : ""}`}
          >
            <div className="panel-heading">
              <span>
                <span className="status-dot" />{" "}
                {source ? "YOUR IMAGE" : "START WITH AN IMAGE"}
              </span>
              <span>{source ? source.format : "JPEG · PNG · WEBP"}</span>
            </div>
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Choose image"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void select(file);
                e.target.value = "";
              }}
            />
            {source ? (
              <SpatialPreview
                key={source.url}
                source={source}
                result={result}
                urls={mapUrls}
                onClear={clear}
              />
            ) : (
              <button
                className={`drop-zone ${dragging ? "dragging" : ""}`}
                aria-label="Select image"
                onClick={() => input.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const files = e.dataTransfer.files;
                  if (files.length !== 1) {
                    setError("Choose one image at a time.");
                    return;
                  }
                  void select(files[0]);
                }}
              >
                <div className="upload-symbol">
                  <ImagePlus size={32} strokeWidth={1.3} />
                  <span className="corner c1" />
                  <span className="corner c2" />
                  <span className="corner c3" />
                  <span className="corner c4" />
                </div>
                <h2>
                  {stage === "decoding"
                    ? "Opening your image…"
                    : dragging
                      ? "Drop it here."
                      : "Start with your image."}
                </h2>
                <p>Drop it here, or choose a file below.</p>
                <span className="select-button">
                  Select image <ArrowRight size={16} />
                </span>
                <small>JPEG, PNG, WEBP · UP TO 20 MiB · 40 MP</small>
              </button>
            )}
            <div className="image-toolbar">
              <div>
                <span className="file-label">
                  {source ? source.name : "No account needed"}
                </span>
                <small>
                  {source
                    ? `${fileSize(source.size)} · Original stays in your browser`
                    : "One image at a time. Nothing to install."}
                </small>
              </div>
              {source ? (
                <button
                  className="text-button"
                  onClick={() => input.current?.click()}
                >
                  <RotateCcw size={14} /> Replace
                </button>
              ) : (
                <LockKeyhole size={16} />
              )}
            </div>
            {source && !result && (
              <button
                className="analyze-button"
                disabled={busy}
                onClick={() => void analyze()}
              >
                {busy ? (
                  <span className="analysis-activity" aria-hidden="true" />
                ) : (
                  <ScanLine size={18} />
                )}{" "}
                {stage === "sampling"
                  ? "Reading image pixels…"
                  : stage === "calculating"
                    ? "Calculating color & light…"
                    : loadingFrame?.workReady
                      ? "Completing presentation…"
                      : busy
                        ? "Analyzing image…"
                        : "Analyze image"}{" "}
                {!busy && <ArrowRight size={18} />}
              </button>
            )}
            {notice && (
              <p role="status" className="result-footnote">
                {notice}
              </p>
            )}
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <span className="sr-only" role="status">
              {stage === "decoding"
                ? "Decoding image"
                : stage === "sampling"
                  ? "Reading pixels"
                  : stage === "calculating"
                    ? "Calculating image statistics"
                    : ""}
            </span>
            <p className="privacy">
              <LockKeyhole size={13} />
              <span>
                Private by default. Image measurements stay in your browser.
                Optional Cloud AI sends a processed copy only with your consent.
              </span>
            </p>
          </div>
          <div ref={resultsPanel} className="results-workspace">
            <div className="panel-heading">
              <span>{result ? "YOUR RESULTS" : "WHAT YOU CAN EXPLORE"}</span>
              <span>{result ? "READY" : loadingFrame ? "PROCESSING" : ""}</span>
            </div>
            {result && source ? (
              <div className="results-reveal">
                <Results result={result} source={source} />
              </div>
            ) : loadingFrame && source ? (
              <AnalysisLoading
                frame={loadingFrame}
                onCancel={cancel}
                source={source}
              />
            ) : (
              <div className="results-empty">
                <div className="empty-top">
                  <span className="eyebrow">From image to ideas</span>
                  <h2>
                    Make more of
                    <br />
                    what you see.
                  </h2>
                  <p>
                    Useful references for your next design, and a clearer
                    understanding of this image.
                  </p>
                </div>
                <div className="feature-list">
                  <div>
                    <span className="feature-index" aria-hidden="true">
                      ●
                    </span>
                    <div>
                      <h3>A palette to take with you</h3>
                      <p>Copy individual colors or a reusable CSS palette.</p>
                    </div>
                  </div>
                  <div>
                    <span className="feature-index blue" aria-hidden="true">
                      ●
                    </span>
                    <div>
                      <h3>Light, made readable</h3>
                      <p>Find light and dark areas without a quality score.</p>
                    </div>
                  </div>
                  <div>
                    <span className="feature-index orange" aria-hidden="true">
                      ●
                    </span>
                    <div>
                      <h3>The facts behind the file</h3>
                      <p>Dimensions, proportions and any recorded metadata.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
        {result && (
          <p className="sr-only" role="status">
            Analysis complete. Your results are ready.
          </p>
        )}
      </main>
      <footer>
        <span>
          OUAHAD SPACE <span className="footer-slash">/</span> HIDDEN DATA
        </span>
        <span>An independent creation by OUAHAD SPACE.</span>
        <a
          href="#method"
          onClick={() => {
            const method = document.getElementById(
              "method",
            ) as HTMLDetailsElement | null;
            if (method) method.open = true;
          }}
        >
          How it works <ArrowRight size={13} />
        </a>
      </footer>
      <details id="method" className="method-details">
        <summary>How the measurements work</summary>
        <p>
          Images are decoded locally. A worker reads original-resolution sRGB
          pixels, without resizing or blending colors. Images up to 262,144
          pixels use every pixel; larger images use one deterministic random
          pixel per grid cell, weighted by cell area. Fully transparent pixels
          are excluded. Partially transparent pixels contribute proportionally,
          without a background color. Coverage is average alpha, not a count of
          nontransparent pixels. Animated images are represented by a decoded
          frame.
        </p>
        <p>
          Colors are grouped in 5-bit RGB buckets, then clustered
          deterministically into up to six RGB families using weighted k-means.
          Shares are approximate and based on visible sampled pixels. Average
          RGB is calculated in encoded sRGB; relative luminance uses linearized
          sRGB and Rec. 709 weights. The histogram has 32 equally spaced
          luminance bins. Tonal spread is measured with population luminance
          standard deviation and range, not text accessibility contrast.
        </p>
        <p>
          Sampling can miss rare colors or extrema. Larger images have
          approximate statistics; bucketed color families are approximate even
          when every pixel is read. Shadow/midtone/highlight cutoffs are
          product-defined bins, not standard exposure categories. Browser
          decoding and low-alpha rounding can affect results. Metadata is read
          locally, with GPS hidden until explicitly revealed. Spatial maps are
          bounded-resolution explorations, not sharpness or quality scores.
          Pixel measurements do not identify subjects; optional AI observations
          are separate interpretations.
        </p>
      </details>
    </div>
  );
}
