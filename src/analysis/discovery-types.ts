export type AnalysisStage =
  | "idle"
  | "decoding"
  | "sampling"
  | "calculating"
  | "metadata"
  | "maps"
  | "preparing";
export interface MetadataDiscovery {
  status: "available" | "missing" | "error";
  fields: { label: string; value: string }[];
  hasLocation: boolean;
  location?: { latitude: number; longitude: number };
}
export interface SpatialMaps {
  width: number;
  height: number;
  light: Uint8ClampedArray;
  detail: Uint8ClampedArray;
  maximumGradient: number;
}
