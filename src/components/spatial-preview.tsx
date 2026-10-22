"use client";
import { useState } from "react";
import type { AnalysisResult, ImageSource } from "@/analysis/types";
export interface MapUrls {
  light: string;
  detail: string;
}
export function SpatialPreview({
  source,
  result,
  urls,
  onClear,
}: {
  source: ImageSource;
  result: AnalysisResult | null;
  urls: MapUrls | null;
  onClear: () => void;
}) {
  const [mode, setMode] = useState("Original");
  const [split, setSplit] = useState(50);
  const imageMode = mode === "Light" ? "light" : "detail";
  const mapped = urls && mode !== "Original";
  return (
    <>
      {urls && (
        <div
          className="view-controls"
          role="group"
          aria-label="Image visualization"
        >
          {["Original", "Light", "Detail", "Compare"].map((view) => (
            <button
              key={view}
              type="button"
              aria-pressed={mode === view}
              onClick={() => setMode(view)}
            >
              {view}
            </button>
          ))}
        </div>
      )}
      <div
        className="preview-area spatial-preview"
        style={{ aspectRatio: `${source.width}/${source.height}` }}
      >
        {/* Native blob previews keep image contents out of Next.js optimization. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="preview"
          src={mapped && mode !== "Compare" ? urls[imageMode] : source.url}
          alt={
            mode === "Original" || mode === "Compare"
              ? `Selected image: ${source.name}`
              : `${mode} map for ${source.name}`
          }
        />
        {mapped && mode === "Compare" && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="comparison-map"
              src={urls.detail}
              alt="Detail comparison overlay"
              style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
            />
            <span className="comparison-line" style={{ left: `${split}%` }} />
          </>
        )}
        <button
          className="remove-image"
          aria-label="Clear image"
          onClick={onClear}
        >
          ×
        </button>
        <span className="image-corner">
          {source.width.toLocaleString()} × {source.height.toLocaleString()} PX
        </span>
      </div>
      {urls && mode === "Compare" && (
        <label className="comparison-control">
          Detail / original split{" "}
          <input
            type="range"
            min="0"
            max="100"
            value={split}
            onChange={(e) => setSplit(Number(e.target.value))}
          />
        </label>
      )}
      {urls && mode !== "Original" && (
        <p className="map-description">
          {mode === "Light"
            ? "Light map: black = relative luminance 0; white = 1. No per-image normalization."
            : "Detail map: white = the strongest Sobel gradient in this map; black = no gradient. Normalized separately per image; not a sharpness or quality score."}{" "}
          {result?.maps?.width} × {result?.maps?.height} pixels; large images
          are downscaled for maps only. Transparent pixels stay transparent;
          detail kernels touching fully transparent pixels are excluded. Edges
          can come from subject texture, noise or resizing. These maps do not
          establish sharp focus, retouching, authenticity or image quality.
        </p>
      )}
      {result?.mapError && <p className="result-footnote">{result.mapError}</p>}
    </>
  );
}
