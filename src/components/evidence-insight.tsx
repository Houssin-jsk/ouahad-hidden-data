import type { EvidenceInsight } from "@/analysis/insight-types";
import { formatDecimal } from "@/lib/format";

const labels: Record<string, string> = {
  p05: "5th percentile",
  median: "Weighted median",
  p95: "95th percentile",
  percentileSpan: "5th–95th percentile span",
  darkShare: "Dark band share",
  midtoneShare: "Midtone band share",
  brightShare: "Bright band share",
  meanSaturation: "Mean HSV saturation",
  lowSaturationShare: "Low saturation share",
  strongSaturationShare: "Strong saturation share",
  intermediateSaturationShare: "Intermediate saturation share",
};
export function EvidenceInsight({
  insight,
  kind,
}: {
  insight?: EvidenceInsight;
  kind: "tonal" | "color";
}) {
  const title =
    kind === "tonal"
      ? "Reading the tonal distribution"
      : "Reading the color distribution";
  return (
    <section
      className="evidence-insight"
      aria-label={title}
      data-testid={`${kind}-insight`}
    >
      <h3>{title}</h3>
      {!insight || insight.status === "unavailable" ? (
        <p className="result-footnote">
          {insight?.status === "unavailable"
            ? insight.reason.message
            : "Distribution insights were not produced for this result. Original measurements remain available."}
        </p>
      ) : (
        <>
          <p className="insight-basis">
            {insight.basis.approximate
              ? "Sample-based estimates"
              : "All decoded pixels"}{" "}
            · opacity-weighted
          </p>
          <p className="insight-observation">
            <strong>Observation.</strong> {insight.observation}
          </p>
          <p>
            <strong>Meaning.</strong> {insight.interpretation.text}
          </p>
          <p className="insight-limit">
            <strong>Limitation.</strong> {insight.limitations[0]}
          </p>
          <details>
            <summary>Method and evidence</summary>
            <p>{insight.method.description}</p>
            <p>
              Method: {insight.method.id} · version {insight.method.version}.
              Interpretation rule: {insight.interpretation.ruleId}. Band
              boundaries are product-defined descriptions. Shares are measured
              proportions, never confidence percentages.
            </p>
            <dl className="insight-evidence">
              {Object.entries(insight.measurements).map(
                ([key, measurement]) => (
                  <div key={key}>
                    <dt>{labels[key]}</dt>
                    <dd>
                      {measurement.unit === "share"
                        ? `${formatDecimal(measurement.value * 100, 1)}%`
                        : formatDecimal(measurement.value, 3)}{" "}
                      <small>
                        {measurement.unit === "share"
                          ? "of weighted area"
                          : measurement.unit === "relative-luminance"
                            ? "relative luminance (0–1)"
                            : "HSV S (unitless, 0–1)"}
                      </small>
                    </dd>
                  </div>
                ),
              )}
            </dl>
            <p>
              {insight.basis.sampledPixels.toLocaleString()} native pixels
              visited; {insight.basis.visibleSamples.toLocaleString()}{" "}
              nontransparent samples from{" "}
              {insight.basis.sourcePixels.toLocaleString()} source pixels.
              Coverage is{" "}
              {formatDecimal(insight.basis.opacityCoverage.value * 100, 1)}%
              mean alpha; it is not the percentage of opaque pixels. Source-cell
              area × alpha weights every measurement.
            </p>
            {insight.limitations.slice(1).map((limitation) => (
              <p key={limitation}>{limitation}</p>
            ))}
          </details>
        </>
      )}
    </section>
  );
}
