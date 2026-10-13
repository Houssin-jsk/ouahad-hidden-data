import { PRESENTATION_STAGES, type LoadingFrame } from "@/loading/presentation";
const shortLabels = ["Read", "Sample", "Palette", "Light", "Detail", "Results"];
export function LoadingStages({ frame }: { frame: LoadingFrame }) {
  return (
    <ol className="loading-stages">
      {PRESENTATION_STAGES.map((step, i) => {
        const selected = i === frame.presentedIndex;
        return (
          <li
            key={step.label}
            className={`${selected ? "selected" : ""} ${i < frame.presentedIndex ? "presented" : ""}`}
            aria-current={selected ? "step" : undefined}
          >
            <span className="loading-stage-number" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="loading-short-label" aria-hidden="true">
              {shortLabels[i]}
            </span>
            <span className="sr-only">{step.label}. </span>
            <span className="sr-only">
              {frame.workReady
                ? "Ready"
                : i < frame.presentedIndex
                  ? "Read"
                  : selected
                    ? "Reviewing"
                    : "Queued"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
