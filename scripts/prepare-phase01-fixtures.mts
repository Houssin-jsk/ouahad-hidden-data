import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { withExif } from "../tests/fixtures/exif.ts";

const directory = new URL("../tests/fixtures/phase01/", import.meta.url);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  const cases = [
    { name: "red.png", width: 40, height: 24, color: "#ff0000" },
    { name: "gray.png", width: 256, height: 16, color: "#808080" },
    { name: "dark.png", width: 40, height: 24, color: "#000000" },
    { name: "bright.png", width: 40, height: 24, color: "#ffffff" },
    { name: "tiny.png", width: 1, height: 1, color: "#ff0000" },
    { name: "large.png", width: 4000, height: 3000, color: "#ff0000" },
    { name: "transparent.png", width: 40, height: 24, color: "transparent" },
    { name: "low-contrast.png", width: 40, height: 24, color: "low-contrast" },
    { name: "quadrants.jpg", width: 40, height: 24, color: "quadrants" },
    { name: "red.webp", width: 40, height: 24, color: "#ff0000" },
  ];
  for (const item of cases) {
    const data = await page.evaluate(({ name, width, height, color }) => {
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      const ctx = c.getContext("2d")!;
      if (color === "quadrants") {
        ["#000000", "#ffffff", "#808080", "#ff0000"].forEach((v, i) => {
          ctx.fillStyle = v;
          ctx.fillRect(
            ((i % 2) * width) / 2,
            (Math.floor(i / 2) * height) / 2,
            width / 2,
            height / 2,
          );
        });
      } else {
        ctx.fillStyle = color === "low-contrast" ? "#7f7f7f" : color;
        ctx.fillRect(0, 0, width, height);
        if (color === "low-contrast") {
          ctx.fillStyle = "#818181";
          ctx.fillRect(width / 2, 0, width / 2, height);
        }
      }
      return c
        .toDataURL(
          name.endsWith("jpg")
            ? "image/jpeg"
            : name.endsWith("webp")
              ? "image/webp"
              : "image/png",
          1,
        )
        .split(",")[1];
    }, item);
    await writeFile(new URL(item.name, directory), Buffer.from(data, "base64"));
    if (item.name === "quadrants.jpg") {
      for (let orientation = 1; orientation <= 8; orientation++)
        await writeFile(
          new URL(`orientation-${orientation}.jpg`, directory),
          withExif(Buffer.from(data, "base64"), orientation),
        );
    }
    if (item.name === "red.png") {
      const bytes = Buffer.from(data, "base64");
      await writeFile(new URL("صورة.photo.png", directory), bytes);
      await writeFile(new URL("photo.jpg.png", directory), bytes);
      // A compressed-size-small bomb header; must be rejected before decode.
      const huge = Buffer.from(bytes);
      huge.writeUInt32BE(100000, 16);
      huge.writeUInt32BE(100000, 20);
      await writeFile(new URL("over-limit.png", directory), huge);
    }
  }
  await writeFile(new URL("empty.png", directory), "");
  await writeFile(
    new URL("malformed.png", directory),
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  await writeFile(
    new URL("unsupported.svg", directory),
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
  );
  await writeFile(new URL("spoof.png", directory), "not image data");
  console.log(`Generated synthetic Phase 01 corpus using ${browser.version()}`);
} finally {
  await browser.close();
}
