import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir(".cloud-ai", { recursive: true });
await writeFile(
  ".cloud-ai/admin.env",
  `CLOUD_AI_ADMIN_SECRET=${randomBytes(32).toString("base64url")}\n`,
  { flag: "wx", mode: 0o600 },
);
console.log(
  "Owner credential saved to ignored .cloud-ai/admin.env. No environment, account or deployment was changed.",
);
