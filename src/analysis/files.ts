export const MAX_BYTES = 20 * 1024 * 1024;
export const MAX_PIXELS = 40_000_000;
export async function validateFile(file: File): Promise<string> {
  if (!file.size) throw new Error("This file is empty. Choose a valid image.");
  if (file.size > MAX_BYTES)
    throw new Error("This image exceeds 20 MB. Please choose a smaller file.");
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  let format = "";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) format = "JPEG";
  else if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v))
    format = "PNG";
  else if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    format = "WebP";
  if (!format)
    throw new Error("Unsupported file. Choose a JPEG, PNG or WebP image.");
  const mime = { JPEG: "image/jpeg", PNG: "image/png", WebP: "image/webp" }[
    format
  ];
  if (file.type && file.type !== mime)
    throw new Error("The file contents do not match its image type.");
  return format;
}
export function decodeImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeout = window.setTimeout(() => {
      image.src = "";
      reject(new Error("Image decoding timed out. Try a smaller image."));
    }, 15000);
    image.onload = () => {
      clearTimeout(timeout);
      if (
        !image.naturalWidth ||
        image.naturalWidth * image.naturalHeight > MAX_PIXELS
      ) {
        image.src = "";
        reject(new Error("Choose an image with at most 40 million pixels."));
      } else resolve(image);
    };
    image.onerror = () => {
      clearTimeout(timeout);
      reject(
        new Error("This image could not be decoded. It may be corrupted."),
      );
    };
    image.src = url;
  });
}
