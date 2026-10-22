# Phase 4.1 photographs

These files are development-test inputs, not product sample illustrations. No fixture is automatically loaded into the production image workspace.

- Simple recognizable object: `../tiger.jpg`, the existing Transformers.js documentation example; see its existing provenance note.
- Multiple objects: `cats.jpg`, the official Transformers.js object-detection example, a copy of COCO validation image 000000039769. Source: https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/cats.jpg . Visually inspected: two cats, two physical remotes, a couch. The copy does not carry an independently verified image-specific license; resolve original photographer attribution before redistribution outside development tests.
- Locally relevant cooking: `outdoor-cooking.jpg`, **Md.Boualam Tajine,Outdoor cooking.jpg**, photographed by **محمد بوعلام عصامي**, 19 August 2013. Unmodified original, CC BY-SA 3.0. Source and attribution: https://commons.wikimedia.org/wiki/File:Md.Boualam_Tajine,Outdoor_cooking.jpg . License: https://creativecommons.org/licenses/by-sa/3.0/ . Visually inspected: tagines and a metal kettle over a wood fire, rocky outdoor background. This is a comparable photograph, not the user's unavailable original photograph.

Only model input pixels are passed into the browser worker; image metadata is not an inference input.
