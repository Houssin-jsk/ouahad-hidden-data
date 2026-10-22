import "server-only";
import { handleVision } from "@/cloud-vision/server/handler";
import { configuredLedger } from "@/cloud-vision/server/database";
import { after } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const started = Date.now();
  let admitted = false;
  const response = await handleVision(request, process.env, {
    onAdmitted: () => {
      admitted = true;
    },
  });
  if (admitted)
    after(async () => {
      try {
        // Metadata-only cleanup uses the time left inside the existing 60s
        // route limit. It cannot extend a slow inference invocation.
        const remaining = maxDuration * 1000 - (Date.now() - started) - 1000;
        if (remaining > 0)
          await configuredLedger(
            process.env,
            AbortSignal.timeout(Math.min(8000, remaining)),
          ).prune();
      } catch {
        /* A later admitted request retries metadata-only retention cleanup. */
      }
    });
  return response;
}
export function GET() {
  return new Response(null, {
    status: 405,
    headers: { Allow: "POST", "Cache-Control": "no-store" },
  });
}
export const HEAD = GET;
export const OPTIONS = GET;
