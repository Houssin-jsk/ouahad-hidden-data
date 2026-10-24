"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { AnalysisResult, ImageSource } from "@/analysis/types";
import { hex } from "@/analysis/pixels";
import { fileSize, formatDecimal } from "@/lib/format";
import { imageDNA } from "@/analysis/dna";
import { paletteText, tonalSummary } from "@/lib/image-summary";
import { MetadataResults } from "./metadata-results";
import { EvidenceInsight } from "./evidence-insight";
import { CloudObservations } from "./cloud-observations";
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
  function selectTab(value: string, moveFocus = false) {
    setTab(value);
    if (moveFocus)
      document.getElementById(`tab-${value}`)?.focus({ preventScroll: true });
  }
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
      setCopied("");
      setCopyError("Clipboard unavailable.");
    }
  }
  return (
    <div className="results-content">
      <div className="results-tabs" role="tablist" aria-label="Result sections">
        {tabs.map((t, index) => (
          <button
            key={t}
            role="tab"
            id={`tab-${t.replaceAll(" ", "-")}`}
            aria-controls="result-panel"
            aria-selected={tab === t}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => selectTab(t)}
            onKeyDown={(event) => {
              let next = index;
              if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
              else if (event.key === "ArrowLeft")
                next = (index + tabs.length - 1) % tabs.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = tabs.length - 1;
              else return;
              event.preventDefault();
              selectTab(tabs[next], true);
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div
        id="result-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab.replaceAll(" ", "-")}`}
      >
        {tab === "Metadata" && <MetadataResults metadata={r.metadata} />}
        {tab === "Overview" && (
          <>
            <div className="result-title">
              <span className="eyebrow">IMAGE DNA</span>
              <h2>Your image, at a glance.</h2>
              <p>Measured from the pixels. Ready to explore.</p>
            </div>
            <div className="image-summary" data-testid="image-dna">
              <div className="summary-color">
                <span
                  className="summary-swatch"
                  style={{ background: r.palette[0].hex }}
                  aria-hidden="true"
                />
                <div>
                  <span className="summary-label">Leading color family</span>
                  <strong>{r.palette[0].hex}</strong>
                  <p>
                    About {percent(r.palette[0].share)} of the measured color
                    area.
                  </p>
                </div>
              </div>
              <div>
                <span className="summary-label">Light character</span>
                <strong>{tonalSummary(r.luminance)}</strong>
                <p>Explore Light to see how the tones are distributed.</p>
              </div>
              {r.coverage < 1 && (
                <div>
                  <span className="summary-label">Transparency detected</span>
                  <p>
                    Clear areas contribute no color; partly transparent pixels
                    count proportionally.
                  </p>
                </div>
              )}
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
              <span>Your measured palette</span>
              <button onClick={() => selectTab("Color", true)}>
                Explore palette ↗
              </button>
            </div>
            <div className="summary-actions">
              <button
                className="palette-action"
                onClick={() => void copy(paletteText(r.palette))}
              >
                <Copy size={15} /> Copy palette
              </button>
              <button
                className="text-button"
                onClick={() => selectTab("Light", true)}
              >
                Explore light <span aria-hidden="true">↗</span>
              </button>
            </div>
          </>
        )}
        <div hidden={tab !== "Overview"}>
          <CloudObservations key={s.url} url={s.url} />
        </div>
        {tab === "Color" && (
          <>
            <div className="result-title">
              <span className="eyebrow">COLOR SIGNATURE</span>
              <h2>Take the colors with you.</h2>
              <p>
                Copy a color for your next design, or take the whole palette.
                Proportions show how much of the measured area each family
                represents.
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
            <div className="palette-actions">
              <button
                className="palette-action"
                onClick={() => void copy(paletteText(r.palette))}
              >
                <Copy size={15} /> Copy palette
              </button>
              <button
                className="palette-action secondary-action"
                onClick={() => void copy(paletteText(r.palette, true))}
              >
                Copy CSS
              </button>
            </div>
            <details className="palette-text">
              <summary>View palette text</summary>
              <label>
                HEX codes
                <textarea
                  aria-label="Palette HEX codes"
                  readOnly
                  value={paletteText(r.palette)}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </label>
              <label>
                CSS variables
                <textarea
                  aria-label="Palette CSS variables"
                  readOnly
                  value={paletteText(r.palette, true)}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </label>
            </details>
            <div className="average-color">
              <span className="swatch" style={{ background: hex(r.average) }} />
              <div>
                <span>AVERAGE COLOR</span>
                <strong>{hex(r.average)}</strong>
                <small>RGB {r.average.join(" / ")}</small>
              </div>
            </div>
            <p className="result-footnote">
              Average color is one RGB mean across the measured pixels. It is
              different from the grouped palette, and may not appear in the
              image.
            </p>
            <details className="distribution-details">
              <summary>Color distribution details</summary>
              <EvidenceInsight kind="color" insight={r.analytics?.color} />
            </details>
          </>
        )}
        {tab === "Light" && (
          <>
            <div className="result-title">
              <span className="eyebrow">LIGHT & TONAL BALANCE</span>
              <h2>Read the light.</h2>
              <p>
                {tonalSummary(r.luminance)}. Taller bars mean more of the image
                falls in that light range. Dark or bright is not a quality
                judgment.
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
            <details className="light-technical">
              <summary>Exact light measurements</summary>
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
                    {approximate
                      ? "Sampled luminance range"
                      : "Luminance range"}
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
                values mean more variation. It is not an accessibility ratio or
                a universal image-contrast score.
              </p>
            </details>
            <p className="exploration-hint">
              To locate these tones in the picture, open{" "}
              <strong>Explore light &amp; detail</strong> beneath your image.
            </p>
            <details className="distribution-details">
              <summary>Light distribution details</summary>
              <EvidenceInsight kind="tonal" insight={r.analytics?.tonal} />
            </details>
          </>
        )}
        <p className="copy-feedback" role="status">
          {copied &&
            (copied.startsWith(":root")
              ? "CSS variables copied."
              : copied.includes(",")
                ? "Palette copied."
                : `Copied ${copied}`)}
        </p>
        {copyError && (
          <p role="alert" className="copy-error">
            {copyError} Open Color → View palette text to select and copy
            manually.
          </p>
        )}
        <details className="measurement-details">
          <summary>Technical details</summary>
          <p className="result-footnote" data-testid="technical-summary">
            {imageDNA(r, s)}
          </p>
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
            proportionally. Palette colors are approximate cluster means; even
            with every pixel read, a palette color may not match an individual
            pixel. These are local measurements, separate from AI observations.
          </p>
        </details>
      </div>
    </div>
  );
}
