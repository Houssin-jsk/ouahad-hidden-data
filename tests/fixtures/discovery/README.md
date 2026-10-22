# Frozen Phase 4.2 photograph set

See `benchmark.json` for the preregistered scene scope and `docs/evidence/phase-4-2-benchmark.json` for model outputs. The library was not edited after inference to make these photographs score better.

Unmodified Wikimedia originals, downloaded only as development fixtures:

- **indoor.jpg** — [Apartment Living Room 2 2018-09-28.jpg](https://commons.wikimedia.org/wiki/File:Apartment_Living_Room_2_2018-09-28.jpg), **FASTILY**, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Visual inspection shows an empty room, not furniture. This deliberately tests a description missing from the library.
- **landscape.jpg** — [Scenic view of lake with mountains.jpg](https://commons.wikimedia.org/wiki/File:Scenic_view_of_lake_with_mountains.jpg), **Karthika Manikandan**, [CC0](https://creativecommons.org/publicdomain/zero/1.0/). Lake, mountains, vegetation and cultivated surroundings.
- **reflection.jpg** — [Reflection in a window with hand-blown glass 4.jpg](https://commons.wikimedia.org/wiki/File:Reflection_in_a_window_with_hand-blown_glass_4.jpg), **W.carter**, [CC0](https://creativecommons.org/publicdomain/zero/1.0/). Distorted reflections through old glass; an intentionally ambiguous image.

The other three inputs reuse the Phase 4.1 tiger, cats and outdoor tagine fixtures, with attribution and license limitations in their existing README files. The outdoor cooking photograph is comparable to the user's scene, not the user's original image.

The `.source.json` files preserve Wikimedia API provenance for these public test assets. They are not model inputs. No application user's image or metadata is written to these fixtures or evidence files.
