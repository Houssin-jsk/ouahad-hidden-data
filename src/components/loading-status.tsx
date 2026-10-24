import type { LoadingFrame } from "@/loading/presentation";
const actual: Record<string, string> = {
  decoding: "Opening your image.",
  sampling: "Reading the image colors.",
  calculating: "Measuring color and light.",
  metadata: "Checking recorded file information.",
  maps: "Mapping light, edges and texture.",
  preparing: "Preparing your results.",
};
export function LoadingStatus({ frame }: { frame: LoadingFrame }) {
  return (
    <div className="loading-status">
      <p className="loading-status-note" role="status" aria-live="polite">
        {frame.workReady ? "Results ready." : actual[frame.stage]}
      </p>
    </div>
  );
}
