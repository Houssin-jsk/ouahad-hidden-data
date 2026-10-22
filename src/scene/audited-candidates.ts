import { SCENE_LIBRARY } from "./candidates";
/** Audit frozen before the new 24-photo benchmark. No post-inference prompt tuning. */
export const AUDITED_LIBRARY_VERSION = "ouahad-scenes-36-v2-audit";
const changes: Record<string, string> = {
  "living-room": "a living room or sitting area",
  bedroom: "a bedroom interior",
  drinks: "cups, glasses or drinking vessels",
  wildlife: "wild animals",
  pets: "domestic pets",
  "street-people": "people in a public outdoor space",
  tools: "tools or workshop equipment",
  music: "musical instruments",
};
export const AUDITED_SCENE_LIBRARY = SCENE_LIBRARY.map((candidate) =>
  Object.freeze({
    ...candidate,
    description: changes[candidate.id] ?? candidate.description,
  }),
);
