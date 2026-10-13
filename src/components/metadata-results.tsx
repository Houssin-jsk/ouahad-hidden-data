"use client";
import { useState } from "react";
import type { MetadataDiscovery } from "@/analysis/discovery-types";
export function MetadataResults({
  metadata,
}: {
  metadata: MetadataDiscovery | undefined;
}) {
  const [revealed, setRevealed] = useState(false);
  if (!metadata)
    return (
      <p className="result-footnote">Metadata inspection is unavailable.</p>
    );
  return (
    <>
      <div className="result-title">
        <span className="eyebrow">HIDDEN METADATA</span>
        <h2>Behind the pixels.</h2>
        <p>
          Recorded file information. Dates and settings are not independently
          verified.
        </p>
      </div>
      {metadata.status === "missing" ? (
        <p className="result-footnote">
          No supported camera or location metadata was found. It may have been
          stripped or never recorded.
        </p>
      ) : metadata.status === "error" ? (
        <p role="status" className="result-footnote">
          Metadata could not be read. The file may contain malformed or
          unsupported metadata. Image statistics are still available.
        </p>
      ) : (
        <>
          <dl className="metadata-fields">
            {metadata.fields.map((field) => (
              <div key={field.label}>
                <dt>{field.label}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
          </dl>
          {!metadata.fields.length && (
            <p className="result-footnote">No camera settings are available.</p>
          )}
          <p className="result-footnote">
            Capture time is shown as recorded, with no timezone assumed.
            Browsers apply image orientation to the preview and maps.
          </p>
        </>
      )}
      {metadata.hasLocation && (
        <div className="location-disclosure">
          <strong>Location metadata detected</strong>
          <p>
            Coordinates can reveal where an image was taken. Reveal only if you
            are comfortable showing this private information on your screen.
            Nothing is transmitted.
          </p>
          <button
            type="button"
            className="text-button"
            onClick={() => setRevealed((v) => !v)}
            aria-expanded={revealed}
          >
            {revealed ? "Hide location" : "Reveal location on this screen"}
          </button>
          {revealed &&
            (metadata.location ? (
              <dl className="metadata-fields" aria-label="Revealed location">
                <div>
                  <dt>Latitude</dt>
                  <dd>{metadata.location.latitude.toFixed(5)}°</dd>
                </div>
                <div>
                  <dt>Longitude</dt>
                  <dd>{metadata.location.longitude.toFixed(5)}°</dd>
                </div>
              </dl>
            ) : (
              <p>
                Location tags exist, but valid coordinates could not be decoded.
              </p>
            ))}
        </div>
      )}
    </>
  );
}
