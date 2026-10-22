# AI smoke fixture

`tiger.jpg` is the known 612 × 408 tiger example referenced by the official Transformers.js image-classification documentation/source.

Source: https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/tiger.jpg

Used only by development tests, never served as a product asset. It was visually inspected before asserting its known subject. The dataset does not establish an image-specific license in the downloaded file; resolve that provenance before distributing this fixture beyond development testing. The model and runtime licenses are documented separately.

## FINAL READINESS AUDIT — EXIT REVIEW

The original remains locally available but is narrowly excluded from Git because its image-specific redistribution rights are unresolved. The same rule applies to `evaluation/cats.jpg` and the sixteen `readiness/coco-*.jpg` originals. Their provenance records, historical results and assertions are preserved. A public clone must use the frozen source/hash restoration records only when authorized to acquire those optional evaluation inputs; this is not permission to redistribute them. Production `npm test` needs none of these inputs or optional downloaded models. `npm run test:all` explicitly runs every retained historical assertion when those optional assets are already present.

Byte identity for authorized restoration of the documentation examples:

| File | Original URL | SHA-256 |
| --- | --- | --- |
| `tiger.jpg` | `https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/tiger.jpg` | `2ae007fbc16880208ba5fb699e52806cb0eadf41b12fc115cfd92b995b275fd8` |
| `evaluation/cats.jpg` | `https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/cats.jpg` | `5dddd2c5e0788ffbb37d8b8d9a30b41b83dfbc1cf486c0b214d5b3af09b283c3` |
