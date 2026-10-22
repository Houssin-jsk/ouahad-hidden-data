import type { VisionEvent } from "./types";
let worker: Worker | undefined;
let active: (() => void) | undefined;
let workerPreference = false;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
/** Warm model survives tab switches and completed image analyses. Active replacement releases the worker. */
export function runVision(
  bitmap: ImageBitmap,
  onEvent: (event: VisionEvent) => void,
  preferWasm = false,
): () => void {
  active?.();
  clearTimeout(idleTimer);
  if (worker && preferWasm && !workerPreference) {
    worker.terminate();
    worker = undefined;
  }
  if (!worker) workerPreference = preferWasm;
  worker ??= new Worker(new URL("./vision.worker.ts", import.meta.url));
  const current = worker;
  let finished = false;
  const timer = setTimeout(() => {
    stop();
    onEvent({
      type: "error",
      message:
        "AI Vision timed out. Retry when the model download or your device is ready. Pixel analysis remains available.",
    });
  }, 120_000);
  function stop() {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    current.terminate();
    if (worker === current) worker = undefined;
    if (active === stop) active = undefined;
  }
  active = stop;
  current.onmessage = (event: MessageEvent<VisionEvent>) => {
    if (finished) return;
    if (event.data.type === "result" || event.data.type === "error") {
      finished = true;
      clearTimeout(timer);
      active = undefined;
      if (event.data.type === "error") {
        current.terminate();
        worker = undefined;
      } else {
        idleTimer = setTimeout(() => {
          if (worker === current && !active) {
            current.terminate();
            worker = undefined;
          }
        }, 300_000);
      }
    }
    onEvent(event.data);
  };
  current.onerror = () => {
    if (finished) return;
    stop();
    onEvent({
      type: "error",
      message:
        "This browser could not start the local AI worker. Try a current browser with WebAssembly and canvas support. Pixel analysis remains available.",
    });
  };
  try {
    current.postMessage({ bitmap, preferWasm }, [bitmap]);
  } catch {
    bitmap.close();
    stop();
    throw new Error("Unable to start local inference");
  }
  return stop;
}
