import type { AnalysisResult, ImageSource } from "@/analysis/types";
import type { MapUrls } from "./spatial-preview";
import { hex } from "@/analysis/pixels";
import { formatDecimal } from "@/lib/format";
export type LoadingEvidence = Pick<
  AnalysisResult,
  "palette" | "average" | "luminance" | "sampledPixels" | "sampling" | "maps"
>;
export function LoadingIllustration({
  index,
  source,
  evidence,
  maps,
}: {
  index: number;
  source: ImageSource;
  evidence: LoadingEvidence | null;
  maps: MapUrls | null;
}) {
  const image =
    index === 3 && maps
      ? maps.light
      : index === 4 && maps
        ? maps.detail
        : source.url;
  const peak = evidence ? Math.max(...evidence.luminance.histogram) : 1;
  const caption =
    index === 0
      ? "Reading the selected image"
      : index === 1
        ? "Sampling grid · schematic view"
        : index === 2
          ? evidence
            ? "Measured RGB color families"
            : "Waiting for palette measurements"
          : index === 3
            ? evidence
              ? maps
                ? "Relative luminance · measured distribution"
                : "Measured histogram · light map unavailable"
              : "Luminance scale · measurements pending"
            : index === 4
              ? maps
                ? evidence?.maps?.maximumGradient === 0
                  ? "No gradient at this map resolution"
                  : "Sobel detail · strongest gradient is white"
                : evidence
                  ? "Detail map unavailable · statistics remain ready"
                  : "Waiting for the computed detail map"
              : "Assembling the measured report";
  return (
    <figure
      className={`dna-illustration dna-phase-${index}`}
      aria-label="Stage visualization"
    >
      <div className="dna-figure-head">
        <span>{source.format} / LOCAL SOURCE</span>
        <span>
          {source.width.toLocaleString()} × {source.height.toLocaleString()}
        </span>
      </div>
      <div className="dna-scene" key={index} aria-hidden="true">
        {index < 5 ? (
          <>
            <div className="dna-image-frame">
              {/* Native object URLs keep the original and computed maps local. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="dna-source-image" />
              <i className="dna-corner top-left" />
              <i className="dna-corner top-right" />
              <i className="dna-corner bottom-left" />
              <i className="dna-corner bottom-right" />
              {index === 0 && <span className="dna-read-line" />}
              {index === 1 && (
                <div className="dna-sampling-grid">
                  {Array.from({ length: 48 }, (_, i) => (
                    <i
                      key={i}
                      style={{ animationDelay: `${(i % 8) * 0.12}s` }}
                    />
                  ))}
                </div>
              )}
              {index === 4 && maps && <span className="dna-detail-reveal" />}
              {index === 4 && !maps && <span className="dna-wait-marker" />}
            </div>
            {index === 1 && (
              <span className="dna-sampling-caption">
                {evidence
                  ? `${evidence.sampledPixels.toLocaleString()} native pixels analyzed`
                  : "Native pixels · no interpolation in statistics"}
              </span>
            )}
            {index === 2 && (
              <div className="dna-palette">
                {evidence ? (
                  <>
                    <div className="dna-palette-bar">
                      {evidence.palette.map((color, i) => (
                        <span
                          key={color.hex}
                          style={{
                            background: color.hex,
                            flex: color.share,
                            animationDelay: `${i * 0.06}s`,
                          }}
                        />
                      ))}
                    </div>
                    <div className="dna-palette-codes">
                      {evidence.palette.map((color) => (
                        <code key={color.hex}>{color.hex}</code>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="dna-palette-pending">
                    {Array.from({ length: 6 }, (_, i) => (
                      <span key={i} />
                    ))}
                  </div>
                )}
              </div>
            )}
            {index === 3 && (
              <div className="dna-luminance">
                {evidence ? (
                  <svg
                    viewBox="0 0 320 52"
                    preserveAspectRatio="none"
                    className="dna-histogram"
                  >
                    {evidence.luminance.histogram.map((value, i) => (
                      <rect
                        key={i}
                        data-share={value}
                        x={i * 10 + 2}
                        y={52 - (value / peak) * 48}
                        width="6"
                        height={(value / peak) * 48}
                      />
                    ))}
                  </svg>
                ) : (
                  <div className="dna-luminance-pending" />
                )}
                <div className="dna-light-scale">
                  {evidence && (
                    <i style={{ left: `${evidence.luminance.mean * 100}%` }} />
                  )}
                </div>
                <div className="dna-light-labels">
                  <span>0 / BLACK</span>
                  <span>1 / WHITE</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="dna-report-assembly">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={source.url} alt="" />
            <div className="dna-report-lines">
              {[
                [
                  "Average color",
                  evidence ? hex(evidence.average) : "Awaiting measurements",
                ],
                [
                  "RGB families",
                  evidence
                    ? String(evidence.palette.length)
                    : "Awaiting measurements",
                ],
                [
                  "Mean luminance",
                  evidence
                    ? `${evidence.sampling.mode === "stratified" ? "≈ " : ""}${formatDecimal(evidence.luminance.mean, 2)}`
                    : "Awaiting measurements",
                ],
                [
                  "Detail map",
                  maps
                    ? "Generated locally"
                    : evidence
                      ? "Unavailable"
                      : "Preparing",
                ],
              ].map(([label, value], i) => (
                <div key={label} style={{ animationDelay: `${i * 0.1}s` }}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            {evidence && (
              <div className="dna-report-palette">
                {evidence.palette.map((color) => (
                  <span
                    key={color.hex}
                    style={{ background: color.hex, flex: color.share }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
