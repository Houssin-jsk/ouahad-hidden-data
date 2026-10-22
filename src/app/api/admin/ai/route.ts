import "server-only";
import { handleAdmin } from "@/cloud-vision/server/admin";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return handleAdmin(request, process.env);
}
export async function POST(request: Request) {
  return handleAdmin(request, process.env);
}
