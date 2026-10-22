import "server-only";
import { handleAdminSession } from "@/cloud-vision/server/admin";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleAdminSession(request, process.env);
}
