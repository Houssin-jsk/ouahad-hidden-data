export type Coverage = "whole" | "multi-crop";
export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}
export function sceneViewPlan(
  width: number,
  height: number,
  coverage: Coverage,
): { name: string; region: Region | null }[] {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  )
    throw Error("Invalid image dimensions");
  const whole = { name: "whole", region: null };
  if (coverage === "whole") return [whole];
  const side = Math.min(width, height) * 0.75;
  const center = {
    name: "center",
    region: {
      x: (width - side) / 2,
      y: (height - side) / 2,
      width: side,
      height: side,
    },
  };
  const horizontal = width >= height;
  return [
    whole,
    center,
    {
      name: horizontal ? "left" : "top",
      region: {
        x: horizontal ? 0 : (width - side) / 2,
        y: horizontal ? (height - side) / 2 : 0,
        width: side,
        height: side,
      },
    },
    {
      name: horizontal ? "right" : "bottom",
      region: {
        x: horizontal ? width - side : (width - side) / 2,
        y: horizontal ? (height - side) / 2 : height - side,
        width: side,
        height: side,
      },
    },
  ];
}
