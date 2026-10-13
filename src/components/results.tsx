"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { AnalysisResult, ImageSource } from "@/analysis/types";
import { hex } from "@/analysis/pixels";
import { fileSize, formatDecimal } from "@/lib/format";
import { imageDNA } from "@/analysis/dna";
import { MetadataResults } from "./metadata-results";
const percent = (n: number) => formatDecimal(n * 100, 1) + "%";
const tabs = ["Overview", "Color", "Light", "Metadata"];
function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}
export function Results({
  result: r,
  source: s,
}: {
  result: AnalysisResult;
  source: ImageSource;
}) {
  const [tab, setTab] = useState("Overview");
  const [copied, setCopied] = useState("");
  const [copyError, setCopyError] = useState("");
  const divisor = gcd(s.width, s.height);
  const approximate = r.sampling.mode === "stratified";
  const value = (v: number) =>
    `${approximate ? "≈ " : ""}${formatDecimal(v, approximate ? 2 : 3)}`;
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setCopyError("");
    } catch {
      setCopyError("Clipboard unavailable. Select the HEX code to copy it.");
    }
  }
  return (
    <div className="results-content">
      <div className="results-tabs" role="tablist" aria-label="Result sections">
        {tabs.map((t, index) => (
          <button
            key={t}
            role="tab"
            id={`tab-${t}`}
            aria-controls="result-panel"
            aria-selected={tab === t}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => setTab(t)}
            onKeyDown={(event) => {
              let next = index;
              if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
              else if (event.key === "ArrowLeft")
                next = (index + tabs.length - 1) % tabs.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = tabs.length - 1;
              else return;
              event.preventDefault();
              setTab(tabs[next]);
              document.getElementById(`tab-${tabs[next]}`)?.focus();
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div id="result-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "Metadata" && <MetadataResults metadata={r.metadata} />}
        {tab === "Overview" && (
          <>
            <div className="result-title">
              <span className="eyebrow">IMAGE DNA</span>
              <h2>The bigger picture.</h2>
              <p data-testid="image-dna">{imageDNA(r, s)}</p>
            </div>
            <dl className="properties">
              <div>
                <dt>Dimensions</dt>
                <dd>
                  {s.width.toLocaleString()} <span>×</span>{" "}
                  {s.height.toLocaleString()} <small>px</small>
                </dd>
              </div>
              <div>
                <dt>Aspect ratio</dt>
                <dd>
                  {s.width / divisor}:{s.height / divisor}{" "}
                  <small>({(s.width / s.height).toFixed(2)})</small>
                </dd>
              </div>
              <div>
                <dt>File size</dt>
                <dd title={`${s.size.toLocaleString()} bytes`}>
                  {fileSize(s.size)}
                </dd>
              </div>
              <div>
                <dt>File format</dt>
                <dd>{s.format}</dd>
              </div>
            </dl>
            <div
              className="overview-palette"
              role="img"
              tabIndex={0}
              aria-label={`Dominant colors: ${r.palette.map((p) => `${p.hex}, ${percent(p.share)}`).join("; ")}`}
            >
              {r.palette.map((p) => (
                <span
                  key={p.hex}
                  style={{ background: p.hex, flex: p.share }}
                  data-tooltip={`${p.hex}: ${percent(p.share)}`}
                />
              ))}
            </div>
            <div className="overview-caption">
              <span>THE IMAGE, IN COLOR</span>
              <button onClick={() => setTab("Color")}>Explore palette ↗</button>
            </div>
            <div className="overview-light">
              <span>Average relative luminance</span>
              <strong>
                {approximate ? "≈ " : ""}
                {percent(r.luminance.mean)}
              </strong>
              <div className="luminance-track">
                <i style={{ left: `${r.luminance.mean * 100}%` }} />
              </div>
              <div className="axis">
                <span>Dark</span>
                <span>Light</span>
              </div>
              <p className="result-footnote">
                Mean light level after linearizing sRGB: 0 is black, 1 is white.
                This is not perceived brightness or exposure.
              </p>
            </div>
          </>
        )}
        {tab === "Color" && (
          <>
            <div className="result-title">
              <span className="eyebrow">COLOR SIGNATURE</span>
              <h2>A palette, revealed.</h2>
              <p>
                Up to six RGB color families. Shares account for pixel area and
                alpha.
              </p>
            </div>
            <div
              className="palette-distribution"
              role="img"
              tabIndex={0}
              aria-label={`Color distribution: ${r.palette.map((p) => `${p.hex}, ${percent(p.share)}`).join("; ")}`}
            >
              {r.palette.map((p) => (
                <span
                  key={p.hex}
                  style={{ background: p.hex, flex: p.share }}
                  data-tooltip={`${p.hex} ${percent(p.share)}`}
                />
              ))}
            </div>
            <div className="palette-list">
              {r.palette.map((p) => (
                <div key={p.hex}>
                  <span className="swatch" style={{ background: p.hex }} />
                  <code>{p.hex}</code>
                  <span>{percent(p.share)}</span>
                  <button
                    aria-label={`Copy ${p.hex}`}
                    onClick={() => void copy(p.hex)}
                  >
                    {copied === p.hex ? (
                      <Check size={14} />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              ))}
            </div>
            <div className="average-color">
              <span className="swatch" style={{ background: hex(r.average) }} />
              <div>
                <span>AVERAGE COLOR</span>
                <strong>{hex(r.average)}</strong>
                <small>RGB {r.average.join(" / ")}</small>
              </div>
            </div>
            <p className="result-footnote">
              RGB averages are rounded channel means in encoded sRGB, not
              averages of light energy. Palette colors are approximate cluster
              means and may not exist as individual pixels.
            </p>
            <p className="sr-only" role="status">
              {copied && `Copied ${copied}`}
            </p>
            {copyError && <p role="alert">{copyError}</p>}
          </>
        )}
        {tab === "Light" && (
          <>
            <div className="result-title">
              <span className="eyebrow">LIGHT & TONAL BALANCE</span>
              <h2>Where the light lives.</h2>
              <p>
                Relative luminance, from black to white. Bar height shows the
                share in each of 32 equal bins.
              </p>
            </div>
            <div
              className="histogram"
              role="img"
              tabIndex={0}
              aria-label={`32-bin luminance histogram. Shadows ${percent(r.luminance.shadows)}, midtones ${percent(r.luminance.midtones)}, highlights ${percent(r.luminance.highlights)}.`}
            >
              {r.luminance.histogram.map((v, i) => (
                <div
                  key={i}
                  style={{
                    height: `${(v / Math.max(...r.luminance.histogram)) * 100}%`,
                    minHeight: v === 0 ? 0 : undefined,
                    borderWidth: v === 0 ? 0 : undefined,
                  }}
                  data-tooltip={`${(i / 32).toFixed(3)}–${((i + 1) / 32).toFixed(3)}: ${percent(v)}`}
                />
              ))}
            </div>
            <div className="axis">
              <span>0 · Black</span>
              <span>1 · White</span>
            </div>
            <div className="tone-list">
              {[
                ["Shadows", r.luminance.shadows],
                ["Midtones", r.luminance.midtones],
                ["Highlights", r.luminance.highlights],
              ].map(([name, v]) => (
                <div key={name}>
                  <span>{name}</span>
                  <strong>{percent(Number(v))}</strong>
                </div>
              ))}
            </div>
            <dl className="light-stats">
              <div>
                <dt>Mean luminance</dt>
                <dd>{value(r.luminance.mean)}</dd>
              </div>
              <div>
                <dt>Tonal spread · standard deviation</dt>
                <dd>{value(r.luminance.deviation)}</dd>
              </div>
              <div>
                <dt>
                  {approximate ? "Sampled luminance range" : "Luminance range"}
                </dt>
                <dd>
                  {value(r.luminance.min)} — {value(r.luminance.max)}
                </dd>
              </div>
            </dl>
            <p className="result-footnote">
              Product-defined bands: shadows &lt; 0.2 · midtones 0.2–0.7 ·
              highlights ≥ 0.7.
              <br />
              Tonal spread is population luminance standard deviation: larger
              values mean more variation. It is not an accessibility ratio or a
              universal image-contrast score.
            </p>
          </>
        )}
        <p className="sample-note">
          {approximate
            ? `${r.sampledPixels.toLocaleString()} native pixels sampled on a ${r.sampleWidth} × ${r.sampleHeight} grid`
            : `All ${r.sampledPixels.toLocaleString()} decoded pixels analyzed`}
          {" · "}
          {percent(r.coverage)} opacity-weighted coverage (mean alpha).
          <br />
          {approximate
            ? "Approximate: rare colors and extrema can be missed. "
            : ""}
          Transparent pixels are excluded; partial alpha contributes
          proportionally. Local statistics, no AI predictions.
        </p>
      </div>
    </div>
  );
}
