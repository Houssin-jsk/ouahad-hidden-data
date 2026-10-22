import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
await mkdir("docs/phase-03/evidence", { recursive: true });
const { records } = JSON.parse(
  await readFile("tests/fixtures/phase03-final/sources.json", "utf8"),
);
const tiles = await Promise.all(
  records.map(async (x, i) => ({
    input: await sharp(x.file)
      .resize(320, 220, { fit: "contain", background: "white" })
      .extend({ bottom: 28, background: "white" })
      .composite([
        {
          input: Buffer.from(
            `<svg width="320" height="28"><text x="8" y="20" font-size="17">${x.id} ${x.split}</text></svg>`,
          ),
          top: 220,
          left: 0,
        },
      ])
      .png()
      .toBuffer(),
    left: (i % 4) * 320,
    top: Math.floor(i / 4) * 248,
  })),
);
await sharp({
  create: { width: 1280, height: 1488, channels: 3, background: "white" },
})
  .composite(tiles)
  .png()
  .toFile("docs/phase-03/evidence/final/corpus-contact.png");
