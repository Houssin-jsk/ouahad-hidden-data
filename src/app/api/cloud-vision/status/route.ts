import "server-only";
import { handleAvailability } from "@/cloud-vision/server/availability";
export const runtime = "nodejs";
export const maxDuration = 10;
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return handleAvailability(request, process.env);
}
