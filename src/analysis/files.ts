export const MAX_BYTES = 20 * 1024 * 1024;
export const MAX_PIXELS = 40_000_000;
export async function validateFile(file: File): Promise<string> {
  if (!file.size) throw new Error("This file is empty. Choose a valid image.");
  if (file.size > MAX_BYTES)
    throw new Error("This image exceeds 20 MiB. Please choose a smaller file.");
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
  // Read encoded headers before asking the browser to allocate decoded pixels.
  // Input bytes are capped above; JPEG may put its SOF after large APP segments.
  const buffer = await file.arrayBuffer();
  try {
    const dimensions = encodedDimensions(new Uint8Array(buffer), format);
    if (!dimensions)
      throw new Error("This image could not be decoded. It may be corrupted.");
    const [width, height] = dimensions;
    if (!width || !height || width * height > MAX_PIXELS)
      throw new Error("Choose an image with at most 40 million pixels.");
  } finally {
    new Uint8Array(buffer).fill(0);
  }
  return format;
}
/** Header dimensions only; the browser still validates and decodes the image. */
export function encodedDimensions(
  bytes: Uint8Array,
  format: string,
): [number, number] | undefined {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    format === "PNG" &&
    bytes.length >= 24 &&
    String.fromCharCode(...bytes.subarray(12, 16)) === "IHDR"
  )
    return [view.getUint32(16), view.getUint32(20)];
  if (format === "JPEG") {
    let offset = 2;
    while (offset < bytes.length) {
      if (bytes[offset++] !== 0xff) return;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === undefined || marker === 0xda || marker === 0xd9) return;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) return;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) return;
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker)
      ) {
        if (length < 8) return;
        return [view.getUint16(offset + 5), view.getUint16(offset + 3)];
      }
      offset += length;
    }
  }
  if (format === "WebP") {
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const type = String.fromCharCode(...bytes.subarray(offset, offset + 4));
      const size = view.getUint32(offset + 4, true);
      const start = offset + 8;
      if (start + size > bytes.length) return;
      const uint24 = (at: number) =>
        bytes[at] + bytes[at + 1] * 256 + bytes[at + 2] * 65536;
      if (type === "VP8X" && size >= 10)
        return [1 + uint24(start + 4), 1 + uint24(start + 7)];
      if (type === "VP8L" && size >= 5 && bytes[start] === 0x2f) {
        const bits = view.getUint32(start + 1, true);
        return [1 + (bits & 0x3fff), 1 + ((bits >>> 14) & 0x3fff)];
      }
      if (
        type === "VP8 " &&
        size >= 10 &&
        bytes[start + 3] === 0x9d &&
        bytes[start + 4] === 0x01 &&
        bytes[start + 5] === 0x2a
      )
        return [
          view.getUint16(start + 6, true) & 0x3fff,
          view.getUint16(start + 8, true) & 0x3fff,
        ];
      offset = start + size + (size % 2);
    }
  }
}
export function decodeImage(
  url: string,
  signal?: AbortSignal,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const cleanup = () => {
      clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      signal?.removeEventListener("abort", abort);
    };
    const fail = (error: Error) => {
      cleanup();
      image.src = "";
      reject(error);
    };
    const abort = () =>
      fail(new DOMException("Image decoding cancelled.", "AbortError"));
    const timeout = window.setTimeout(() => {
      fail(new Error("Image decoding timed out. Try a smaller image."));
    }, 15000);
    image.onload = () => {
      if (
        !image.naturalWidth ||
        image.naturalWidth * image.naturalHeight > MAX_PIXELS
      ) {
        fail(new Error("Choose an image with at most 40 million pixels."));
      } else {
        cleanup();
        resolve(image);
      }
    };
    image.onerror = () => {
      fail(new Error("This image could not be decoded. It may be corrupted."));
    };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) {
      abort();
      return;
    }
    image.src = url;
  });
}
