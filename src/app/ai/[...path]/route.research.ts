import { researchAsset } from "@/experiments/assets";
export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return researchAsset("ai", (await context.params).path);
}
