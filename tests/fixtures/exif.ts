/** Synthetic TIFF only. Coordinates are invented test values, never user data. */
export function exifFixture(orientation = 6) {
  const buffer = new ArrayBuffer(2048),
    view = new DataView(buffer),
    bytes = new Uint8Array(buffer);
  let end = 8;
  const allocate = (length: number) => {
    const start = end;
    end += length;
    end += end % 2;
    return start;
  };
  const ifd0 = allocate(6 * 12 + 6),
    exif = allocate(5 * 12 + 6),
    gps = allocate(4 * 12 + 6);
  bytes.set([73, 73, 42, 0], 0);
  view.setUint32(4, ifd0, true);
  const short = (value: number) => {
    const b = new Uint8Array(2);
    new DataView(b.buffer).setUint16(0, value, true);
    return b;
  };
  const long = (value: number) => {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, value, true);
    return b;
  };
  const ascii = (value: string) => new TextEncoder().encode(value + "\0");
  const rational = (pairs: number[][]) => {
    const b = new Uint8Array(pairs.length * 8),
      v = new DataView(b.buffer);
    pairs.forEach(([n, d], i) => {
      v.setUint32(i * 8, n, true);
      v.setUint32(i * 8 + 4, d, true);
    });
    return b;
  };
  type Entry = [number, number, Uint8Array];
  const write = (start: number, entries: Entry[]) => {
    view.setUint16(start, entries.length, true);
    entries
      .sort((a, b) => a[0] - b[0])
      .forEach(([tag, type, data], i) => {
        const offset = start + 2 + i * 12;
        view.setUint16(offset, tag, true);
        view.setUint16(offset + 2, type, true);
        view.setUint32(
          offset + 4,
          data.length / (type === 3 ? 2 : type === 4 ? 4 : type === 5 ? 8 : 1),
          true,
        );
        if (data.length <= 4) bytes.set(data, offset + 8);
        else {
          const target = allocate(data.length);
          view.setUint32(offset + 8, target, true);
          bytes.set(data, target);
        }
      });
  };
  write(ifd0, [
    [0x010f, 2, ascii("OUAHAD TEST")],
    [0x0110, 2, ascii("Synthetic Camera")],
    [0x0112, 3, short(orientation)],
    [0x0131, 2, ascii("Fixture Generator")],
    [0x8769, 4, long(exif)],
    [0x8825, 4, long(gps)],
  ]);
  write(exif, [
    [0x9003, 2, ascii("2024:05:06 07:08:09")],
    [0x829a, 5, rational([[1, 125]])],
    [0x829d, 5, rational([[28, 10]])],
    [0x8827, 3, short(200)],
    [0x920a, 5, rational([[35, 1]])],
  ]);
  write(gps, [
    [1, 2, ascii("N")],
    [
      2,
      5,
      rational([
        [12, 1],
        [30, 1],
        [0, 1],
      ]),
    ],
    [3, 2, ascii("W")],
    [
      4,
      5,
      rational([
        [30, 1],
        [15, 1],
        [0, 1],
      ]),
    ],
  ]);
  return buffer.slice(0, end);
}
export function withExif(jpeg: Uint8Array, orientation = 6) {
  const tiff = new Uint8Array(exifFixture(orientation)),
    size = tiff.length + 8;
  const segment = new Uint8Array(tiff.length + 10);
  segment.set([255, 225, size >> 8, size & 255, 69, 120, 105, 102, 0, 0]);
  segment.set(tiff, 10);
  const output = new Uint8Array(jpeg.length + segment.length);
  output.set(jpeg.subarray(0, 2));
  output.set(segment, 2);
  output.set(jpeg.subarray(2), segment.length + 2);
  return output;
}
export function withPngSoftware(png: Uint8Array) {
  const data = new TextEncoder().encode("Software\0OUAHAD Test Editor"),
    chunk = new Uint8Array(data.length + 12),
    view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk.set([116, 69, 88, 116], 4);
  chunk.set(data, 8);
  let crc = 0xffffffff;
  for (const byte of chunk.subarray(4, chunk.length - 4)) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  view.setUint32(chunk.length - 4, (crc ^ 0xffffffff) >>> 0);
  const output = new Uint8Array(png.length + chunk.length);
  output.set(png.subarray(0, png.length - 12));
  output.set(chunk, png.length - 12);
  output.set(png.subarray(png.length - 12), png.length - 12 + chunk.length);
  return output;
}
