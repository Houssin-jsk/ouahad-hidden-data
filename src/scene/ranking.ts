import { SCENE_LIBRARY, SCENE_LIBRARY_VERSION } from "./candidates";
export interface SceneMatch {
  id: string;
  theme: string;
  description: string;
  cosine: number;
}
export interface SceneView {
  name: string;
  region: { x: number; y: number; width: number; height: number } | null;
  ranking: SceneMatch[];
}
export interface SceneDiscovery {
  libraryVersion: string;
  views: SceneView[];
  leading: SceneMatch[];
  themes: string[];
  viewAgreement:
    "whole-only" | "same-leading-match" | "different-leading-matches";
}
export function cosineScores(
  image: ArrayLike<number>,
  texts: ArrayLike<number>,
  dimension: number,
  library = SCENE_LIBRARY,
): number[] {
  if (
    image.length !== dimension ||
    texts.length !== dimension * library.length ||
    dimension <= 0
  )
    throw Error("Unexpected CLIP embedding shape");
  const norm = Math.hypot(...Array.from(image));
  if (!Number.isFinite(norm) || norm === 0)
    throw Error("Invalid image embedding");
  return library.map((_, row) => {
    let dot = 0,
      textNorm = 0;
    for (let col = 0; col < dimension; col++) {
      const value = texts[row * dimension + col];
      dot += image[col] * value;
      textNorm += value * value;
    }
    const score = dot / (norm * Math.sqrt(textNorm));
    if (!Number.isFinite(score)) throw Error("Invalid text embedding");
    return Math.max(-1, Math.min(1, score));
  });
}
export function rankScenes(
  scores: number[],
  library = SCENE_LIBRARY,
): SceneMatch[] {
  if (
    scores.length !== library.length ||
    scores.some((value) => !Number.isFinite(value) || Math.abs(value) > 1)
  )
    throw Error("Invalid similarity scores");
  return library
    .map((candidate, index) => ({
      ...candidate,
      cosine: scores[index],
    }))
    .sort((a, b) => b.cosine - a.cosine || a.id.localeCompare(b.id));
}
/** Whole-frame ranking remains primary. Crop rankings are evidence, never averaged or independent votes. */
export function summarizeViews(
  views: SceneView[],
  libraryVersion = SCENE_LIBRARY_VERSION,
): SceneDiscovery {
  if (
    !views.length ||
    views[0].name !== "whole" ||
    views.some((view) => view.ranking.length !== SCENE_LIBRARY.length)
  )
    throw Error("Missing full-frame ranking");
  const leading = views[0].ranking.slice(0, 5);
  return {
    libraryVersion,
    views,
    leading,
    themes: [...new Set(leading.map((match) => match.theme))],
    viewAgreement:
      views.length === 1
        ? "whole-only"
        : views.every((view) => view.ranking[0].id === leading[0].id)
          ? "same-leading-match"
          : "different-leading-matches",
  };
}
