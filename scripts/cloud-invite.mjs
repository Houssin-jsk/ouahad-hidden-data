// Offline application access, not a provider API credential. Writes only to an
// ignored local file and never changes account, deployment or billing settings.
import { randomBytes, createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
const code = randomBytes(32).toString("base64url");
const hash = createHash("sha256").update(code).digest("hex");
const invitation = {
  [hash]: {
    country: "MA",
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  },
};
await mkdir(".cloud-ai", { recursive: true });
await writeFile(
  ".cloud-ai/invite.json",
  JSON.stringify(
    { code, CLOUD_AI_INVITES: JSON.stringify(invitation) },
    null,
    2,
  ) + "\n",
  { flag: "wx", mode: 0o600 },
);
console.log(
  "New one-day restricted pilot invitation saved to ignored .cloud-ai/invite.json. No environment or deployment was changed.",
);
