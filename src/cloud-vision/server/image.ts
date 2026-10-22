import { MAX_IMAGE_BYTES, MAX_IMAGE_SIDE } from "../contract";
import { ProviderFailure, type VisionImage } from "./types";

// Bounded JPEG container validation. Never accepts remote URLs. Strip every APP
// and COM segment, including those between progressive scans, on the server too.
export function validateCloudImage(
  bytes: Uint8Array,
  mime: string,
): VisionImage {
  const invalid = () => {
    throw new ProviderFailure("invalid_image");
  };
  if (
    mime !== "image/jpeg" ||
    bytes.length < 20 ||
    bytes.length > MAX_IMAGE_BYTES ||
    bytes[0] !== 255 ||
    bytes[1] !== 216
  )
    invalid();
  const chunks: Uint8Array[] = [bytes.subarray(0, 2)];
  let offset = 2,
    width = 0,
    height = 0,
    scans = 0;
  while (offset < bytes.length) {
    const start = offset;
    if (bytes[offset++] !== 255) invalid();
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9) {
      if (offset !== bytes.length || !width || !height || !scans) invalid();
      chunks.push(bytes.subarray(start, offset));
      const clean = new Uint8Array(
        chunks.reduce((n, part) => n + part.length, 0),
      );
      let position = 0;
      for (const part of chunks) {
        clean.set(part, position);
        position += part.length;
      }
      return { bytes: clean, mime: "image/jpeg", width, height };
    }
    if (
      marker === undefined ||
      marker === 0 ||
      marker === 0xd8 ||
      (marker >= 0xd0 && marker <= 0xd7) ||
      marker === 1 ||
      offset + 2 > bytes.length
    )
      invalid();
    const length = bytes[offset] * 256 + bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) invalid();
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      if (width || length < 8 || bytes[offset + 2] !== 8) invalid();
      height = bytes[offset + 3] * 256 + bytes[offset + 4];
      width = bytes[offset + 5] * 256 + bytes[offset + 6];
      const components = bytes[offset + 7];
      if (
        ![1, 3].includes(components) ||
        length !== 8 + components * 3 ||
        !width ||
        !height ||
        width > MAX_IMAGE_SIDE ||
        height > MAX_IMAGE_SIDE
      )
        invalid();
    } else if (
      marker >= 0xc3 &&
      marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marker)
    )
      invalid();
    offset += length;
    if (!((marker >= 0xe0 && marker <= 0xef) || marker === 0xfe))
      chunks.push(bytes.subarray(start, offset));
    if (marker === 0xda) {
      if (!width || length < 6) invalid();
      scans++;
      const scanStart = offset;
      while (offset < bytes.length) {
        if (bytes[offset] !== 255) {
          offset++;
          continue;
        }
        if (
          bytes[offset + 1] === 0 ||
          (bytes[offset + 1] >= 0xd0 && bytes[offset + 1] <= 0xd7)
        ) {
          offset += 2;
          continue;
        }
        break;
      }
      chunks.push(bytes.subarray(scanStart, offset));
    }
  }
  return invalid();
}
