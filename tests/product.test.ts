import { test } from "node:test";
import assert from "node:assert/strict";
import { paletteText, tonalSummary } from "../src/lib/image-summary";

test("palette reuse preserves measured HEX values, order and CSS variable syntax", () => {
  const palette = [{ hex: "#3590DF" }, { hex: "#F3A339" }];
  assert.equal(paletteText(palette), "#3590DF, #F3A339");
  assert.equal(
    paletteText(palette, true),
    ":root {\n  --image-color-1: #3590DF;\n  --image-color-2: #F3A339;\n}",
  );
});
test("light summaries describe a measured majority without assigning image quality", () => {
  assert.equal(
    tonalSummary({ shadows: 0.6, midtones: 0.3, highlights: 0.1 }),
    "Mostly darker tones",
  );
  assert.equal(
    tonalSummary({ shadows: 0.2, midtones: 0.7, highlights: 0.1 }),
    "Mostly middle tones",
  );
  assert.equal(
    tonalSummary({ shadows: 0.1, midtones: 0.2, highlights: 0.7 }),
    "Mostly lighter tones",
  );
  assert.equal(
    tonalSummary({ shadows: 0.5, midtones: 0, highlights: 0.5 }),
    "A mix of tonal ranges",
  );
});
