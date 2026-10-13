import { PRESENTATION_STAGES, type LoadingFrame } from "@/loading/presentation";
const actual: Record<string, string> = {
  decoding: "Decoding the image in your browser.",
  sampling: "Reading native pixels in the analysis worker.",
  calculating: "Computing the palette and light statistics.",
  metadata: "Inspecting embedded metadata locally.",
  maps: "Generating real detail and luminance maps.",
  preparing: "Encoding the visual maps for display.",
};
export function LoadingStatus({ frame }: { frame: LoadingFrame }) {
  return (
    <div className="loading-status">
      <p className="loading-status-note" role="status" aria-live="polite">
        {frame.workReady
          ? "Calculations ready · completing the presentation"
          : actual[frame.stage]}
      </p>
      <p>{PRESENTATION_STAGES[frame.presentedIndex].helper}</p>
      <small>Local processing. No image uploads.</small>
    </div>
  );
}
