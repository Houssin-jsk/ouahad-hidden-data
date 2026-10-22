export interface Observations {
  image_description: string;
  main_visible_objects: string[];
  scene_and_surroundings: string | null;
  notable_visual_details: string[];
  uncertainties: string[];
}
export interface CompanionResult {
  version: "1.1.0";
  observations: Observations;
  limitations: string;
  model: "Qwen3-VL 2B Instruct Q4_K_M";
  elapsedSeconds: number;
}
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number): v is string =>
  typeof v === "string" &&
  v.trim().length > 0 &&
  v.length <= max &&
  !/[\u0000-\u0008\u000b-\u001f]/.test(v);
const list = (v: unknown, max: number): v is string[] =>
  Array.isArray(v) && v.length <= max && v.every((s) => text(s, 2000));
export function validateCompanionResult(value: unknown): CompanionResult {
  if (
    !record(value) ||
    Object.keys(value).sort().join() !==
      "elapsedSeconds,limitations,model,observations,version" ||
    value.version !== "1.1.0" ||
    value.model !== "Qwen3-VL 2B Instruct Q4_K_M" ||
    !text(value.limitations, 500) ||
    typeof value.elapsedSeconds !== "number" ||
    !Number.isFinite(value.elapsedSeconds) ||
    value.elapsedSeconds < 0 ||
    value.elapsedSeconds > 185 ||
    !record(value.observations)
  )
    throw Error(
      "The companion returned an unsupported response. No observations were accepted.",
    );
  const o = value.observations;
  if (
    Object.keys(o).sort().join() !==
      "image_description,main_visible_objects,notable_visual_details,scene_and_surroundings,uncertainties" ||
    !text(o.image_description, 2000) ||
    !(
      o.scene_and_surroundings === null || text(o.scene_and_surroundings, 2000)
    ) ||
    !list(o.main_visible_objects, 40) ||
    !list(o.notable_visual_details, 40) ||
    !list(o.uncertainties, 40)
  )
    throw Error(
      "The companion returned malformed observations. No observations were accepted.",
    );
  return value as unknown as CompanionResult;
}
