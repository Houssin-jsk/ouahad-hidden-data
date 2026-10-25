import { isIP } from "node:net";
import { createHmac } from "node:crypto";
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

// Only trust network headers on Vercel, which overwrites its forwarded IP header.
// Daily HMACs retain neither raw addresses nor stable cross-day identifiers.
export function publicIdentity(
  request: Request,
  env: Environment,
  now = Date.now(),
) {
  if (
    env.VERCEL !== "1" ||
    !/^[A-Za-z0-9_-]{43}$/.test(env.CLOUD_AI_ADMIN_SECRET ?? "")
  )
    return null;
  const ip =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ??
    "";
  const version = isIP(ip);
  if (!version) return null;
  let network = ip;
  if (version === 6) {
    const [left, right = ""] = ip.toLowerCase().split("::");
    const a = left ? left.split(":") : [],
      b = right ? right.split(":") : [];
    network = [
      ...a,
      ...Array(Math.max(0, 8 - a.length - b.length)).fill("0"),
      ...b,
    ]
      .slice(0, 4)
      .map((x) => x.padStart(4, "0"))
      .join(":");
  }
  const country =
    request.headers.get("x-vercel-ip-country")?.toUpperCase() ?? "";
  return {
    client: createHmac("sha256", env.CLOUD_AI_ADMIN_SECRET!)
      .update("public-ai:" + Math.floor(now / 86400000) + ":" + network)
      .digest("hex"),
    country,
  };
}
