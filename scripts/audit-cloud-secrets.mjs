import { readdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const secrets = [
  "GEMINI_API_KEY",
  "NVIDIA_API_KEY",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "CLOUD_AI_D1_API_TOKEN",
  "CLOUDFLARE_D1_API_TOKEN",
  "CLOUD_AI_D1_DATABASE_ID",
  "CLOUDFLARE_D1_DATABASE_ID",
  "CLOUD_AI_ADMIN_SECRET",
]
  .map((k) => process.env[k])
  .filter((v) => v && v.length >= 16);
// Include the temporary capability even after its environment allowlist is revoked.
try {
  const invitation = JSON.parse(
    await readFile(".cloud-ai/invite.json", "utf8"),
  );
  if (typeof invitation.code === "string" && invitation.code.length >= 16)
    secrets.push(invitation.code);
} catch {
  /* A clean checkout need not contain private owner setup. */
}
const patterns = [
  /AIza[0-9A-Za-z_-]{35}/,
  /nvapi-[0-9A-Za-z_-]{30,}/,
  /sk-proj-[0-9A-Za-z_-]{30,}/,
];
const matches = (bytes) =>
  secrets.some((s) => bytes.includes(Buffer.from(s))) ||
  patterns.some((p) => p.test(bytes.toString("utf8")));
const findings = [];
let historyBlobs = 0,
  historyBlobsSkippedOver10MB = 0,
  workingFiles = 0,
  gitCandidateFiles = 0;
const candidates = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8", maxBuffer: 16000000 },
)
  .split("\0")
  .filter(Boolean);
for (const file of new Set(candidates)) {
  gitCandidateFiles++;
  if (matches(await readFile(file)))
    findings.push({ scope: "git_candidate", path: file });
}
const objects = execFileSync("git", ["rev-list", "--objects", "--all"], {
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => line.split(" ")[0]);
const metadata = execFileSync(
  "git",
  ["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"],
  { input: objects.join("\n") + "\n", encoding: "utf8" },
)
  .trim()
  .split("\n");
for (const line of metadata) {
  const [oid, type, size] = line.split(" ");
  if (type !== "blob") continue;
  if (Number(size) > 10000000) {
    historyBlobsSkippedOver10MB++;
    continue;
  }
  historyBlobs++;
  if (
    matches(
      execFileSync("git", ["cat-file", "blob", oid], { maxBuffer: 11000000 }),
    )
  )
    findings.push({ scope: "history", object: oid });
}
async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (
      [".git", "node_modules", "companion-dist", ".cloud-ai"].includes(
        e.name,
      ) ||
      e.name.startsWith(".env")
    )
      continue;
    const name = dir + "/" + e.name;
    if (e.isDirectory()) await walk(name);
    else if (
      /\.(ts|tsx|js|mjs|mts|cjs|json|jsonl|log|md|txt|py|html|css|toml|yaml|yml|ini|cfg|lock)$/.test(
        name,
      )
    ) {
      const b = await readFile(name);
      if (b.length > 10000000) continue;
      workingFiles++;
      if (matches(b)) findings.push({ scope: "workspace_or_logs", path: name });
    }
  }
}
await walk(".");
console.log(
  JSON.stringify(
    {
      historyBlobs,
      historyBlobsSkippedOver10MB,
      gitCandidateFiles,
      workingFiles,
      findings,
      scope:
        "Known configured values plus common Gemini/NVIDIA/OpenAI key patterns; not a forensic certification of all past credentials.",
    },
    null,
    2,
  ),
);
if (findings.length) process.exitCode = 1;
