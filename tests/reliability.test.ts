import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  validateFile,
  encodedDimensions,
  decodeImage,
} from "../src/analysis/files";
import { inspectMetadata } from "../src/analysis/metadata";
import { exifFixture } from "./fixtures/exif";
import { fileSize } from "../src/lib/format";

test("file size labels match binary divisors and exact byte boundaries", () => {
  assert.equal(fileSize(0), "0 B");
  assert.equal(fileSize(1023), "1023 B");
  assert.equal(fileSize(1024), "1.0 KiB");
  assert.equal(fileSize(1048576), "1.00 MiB");
  assert.equal(fileSize(20 * 1048576), "20.00 MiB");
});

const fixture = (name: string) =>
  readFile(new URL(`./fixtures/phase01/${name}`, import.meta.url));
test("encoded header limits reject pixel bombs before browser decoding", async () => {
  await assert.rejects(
    validateFile(
      new File([await fixture("over-limit.png")], "huge.png", {
        type: "image/png",
      }),
    ),
    /40 million/,
  );
  for (const name of [
    "malformed.png",
    "empty.png",
    "unsupported.svg",
    "spoof.png",
  ])
    await assert.rejects(validateFile(new File([await fixture(name)], name)));
});

test("headers read native PNG/JPEG/WebP dimensions independently of names and orientation", async () => {
  for (const [name, format, expected] of [
    ["red.png", "PNG", [40, 24]],
    ["quadrants.jpg", "JPEG", [40, 24]],
    ["orientation-6.jpg", "JPEG", [40, 24]],
    ["red.webp", "WebP", [40, 24]],
    ["large.png", "PNG", [4000, 3000]],
    ["tiny.png", "PNG", [1, 1]],
  ] as const)
    assert.deepEqual(encodedDimensions(await fixture(name), format), expected);
  for (const name of ["صورة.photo.png", "photo.jpg.png"])
    assert.equal(
      await validateFile(new File([await fixture(name)], name)),
      "PNG",
    );
  await assert.rejects(
    validateFile(
      new File([await fixture("red.png")], "fake.jpg", { type: "image/jpeg" }),
    ),
    /do not match/,
  );
});

test("WebP lossless and extended headers plus JPEG malformed lengths stay bounded", () => {
  const extended = new Uint8Array(30);
  extended.set(new TextEncoder().encode("VP8X"), 12);
  extended[16] = 10;
  extended[24] = 99;
  extended[27] = 49;
  assert.deepEqual(encodedDimensions(extended, "WebP"), [100, 50]);
  const lossless = new Uint8Array(26);
  lossless.set(new TextEncoder().encode("VP8L"), 12);
  lossless[16] = 5;
  lossless[20] = 0x2f;
  new DataView(lossless.buffer).setUint32(21, 99 | (49 << 14), true);
  assert.deepEqual(encodedDimensions(lossless, "WebP"), [100, 50]);
  for (const bytes of [
    [],
    [255],
    [255, 216, 255],
    [255, 216, 255, 224, 0, 0],
    [255, 216, 255, 192, 0, 9, 8, 0],
  ])
    assert.equal(encodedDimensions(new Uint8Array(bytes), "JPEG"), undefined);
  extended[16] = 255;
  assert.equal(encodedDimensions(extended, "WebP"), undefined);
});

test("all eight synthetic EXIF orientations parse without changing private location policy", async () => {
  const names = [
    "Normal",
    "Mirrored horizontally",
    "Rotated 180°",
    "Mirrored vertically",
    "Transposed",
    "Rotated 90° clockwise",
    "Transverse",
    "Rotated 90° counterclockwise",
  ];
  for (let orientation = 1; orientation <= 8; orientation++) {
    const result = await inspectMetadata(exifFixture(orientation));
    assert.equal(
      result.fields.find((f) => f.label === "Orientation")?.value,
      names[orientation - 1],
    );
    assert.ok(result.hasLocation);
  }
});

test("browser decoder clears handlers, timers and active image on abort/error/timeout", async () => {
  const originalImage = globalThis.Image;
  const originalWindow = globalThis.window;
  const timers = new Map<number, () => void>();
  let instance: FakeImage;
  class FakeImage {
    src = "";
    naturalWidth = 40;
    naturalHeight = 24;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor() {
      // Capture the fake browser image so the test can dispatch decode events.
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      instance = this;
    }
  }
  const originalClear = globalThis.clearTimeout;
  Object.assign(globalThis, {
    Image: FakeImage,
    window: {
      setTimeout: (fn: () => void) => {
        timers.set(1, fn);
        return 1;
      },
    },
    clearTimeout: (id: number) => timers.delete(id),
  });
  try {
    const controller = new AbortController();
    const pending = decodeImage("blob:cancel", controller.signal);
    controller.abort();
    await assert.rejects(pending, { name: "AbortError" });
    assert.equal(instance!.src, "");
    assert.equal(instance!.onerror, null);
    assert.equal(timers.size, 0);
    const corrupt = decodeImage("blob:corrupt");
    instance!.onerror!();
    await assert.rejects(corrupt, /corrupted/);
    assert.equal(timers.size, 0);
    const stalled = decodeImage("blob:stalled");
    timers.get(1)!();
    await assert.rejects(stalled, /timed out/);
    const tooLarge = decodeImage("blob:large");
    instance!.naturalWidth = 100000;
    instance!.naturalHeight = 100000;
    instance!.onload!();
    await assert.rejects(tooLarge, /40 million/);
    const valid = decodeImage("blob:valid");
    instance!.onload!();
    assert.equal(await valid, instance!);
    assert.equal(instance!.onload, null);
    assert.equal(timers.size, 0);
    await assert.rejects(
      decodeImage("blob:already-cancelled", controller.signal),
      { name: "AbortError" },
    );
  } finally {
    Object.assign(globalThis, {
      Image: originalImage,
      window: originalWindow,
      clearTimeout: originalClear,
    });
  }
});
