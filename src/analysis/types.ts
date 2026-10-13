export type RGB = [number, number, number];
export interface PixelStatistics {
  average: RGB;
  palette: { hex: string; rgb: RGB; share: number }[];
  luminance: {
    mean: number;
    min: number;
    max: number;
    deviation: number;
    histogram: number[];
    shadows: number;
    midtones: number;
    highlights: number;
  };
  sampledPixels: number;
  visibleSamples: number;
  coverage: number;
}
export interface ImageSource {
  url: string;
  name: string;
  width: number;
  height: number;
  size: number;
  format: string;
}
export interface AnalysisResult extends PixelStatistics {
  sampleWidth: number;
  sampleHeight: number;
  sampling: { mode: "all-pixels" | "stratified"; sourcePixels: number };
  metadata?: import("./discovery-types").MetadataDiscovery;
  maps?: {
    width: number;
    height: number;
    light: Blob;
    detail: Blob;
    maximumGradient: number;
  };
  mapError?: string;
}
