import { decodeImage } from "@/analysis/files";
import { MAX_IMAGE_BYTES, MAX_IMAGE_SIDE } from "./contract";

// Canvas draws the browser-oriented pixels. New JPEG excludes original EXIF/GPS,
// filenames, comments and animation. Alpha is composited against white.
export async function prepareCloudImage(
  url: string,
  signal: AbortSignal,
): Promise<Blob> {
  const image = await decodeImage(url, signal);
  const canvas = document.createElement("canvas");
  try {
    signal.throwIfAborted();
    const ratio = Math.min(
      1,
      MAX_IMAGE_SIDE / Math.max(image.naturalWidth, image.naturalHeight),
    );
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("The preview could not be prepared.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82),
    );
    signal.throwIfAborted();
    if (!blob || blob.type !== "image/jpeg" || blob.size > MAX_IMAGE_BYTES)
      throw Error(
        "The cloud preview is too large. Choose a simpler or smaller image.",
      );
    return blob;
  } finally {
    image.src = "";
    canvas.width = canvas.height = 0;
  }
}
