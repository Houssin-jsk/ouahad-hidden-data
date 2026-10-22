import { createHash } from "node:crypto";
import { verifiedUntil, type Environment } from "./config";
// Each high-entropy owner-issued code identifies a restricted participant.
// Neither IP forwarding headers nor client-supplied IDs determine identity.
export function authorize(
  request: Request,
  env: Environment,
  now = Date.now(),
): { client: string; country: string } | null {
  const code = request.headers
    .get("authorization")
    ?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
  if (!code) return null;
  const hash = createHash("sha256").update(code).digest("hex");
  try {
    const invitations = JSON.parse(env.CLOUD_AI_INVITES ?? "{}");
    const entry = invitations[hash];
    if (
      !entry ||
      entry.country !== "MA" ||
      !verifiedUntil(entry.expiresAt, now)
    )
      return null;
    return { client: hash, country: entry.country };
  } catch {
    return null;
  }
}
export function sameOrigin(request: Request, env: Environment) {
  const allowed = env.CLOUD_AI_ORIGIN ?? "https://hidden-data.ouahad.space";
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  try {
    const parsed = new URL(allowed);
    if (parsed.origin !== allowed) return false;
    if (
      parsed.protocol !== "https:" &&
      !(
        parsed.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(parsed.hostname) &&
        !env.VERCEL
      )
    )
      return false;
    return origin === allowed && (!site || site === "same-origin");
  } catch {
    return false;
  }
}
