// Read-only Git inventory and an exact, reviewed pathspec. Never stages files.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, lstatSync } from "node:fs";
const manifestPath = "docs/phase-03/evidence/commit-scope.json";
const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const paths = (...args) =>
  git(...args, "-z")
    .split("\0")
    .filter(Boolean);
const historicalTests =
  /^(?:companion|evaluation|final-ai|phase03|readiness|scene|vision)\.test\.ts$/;
function category(file) {
  if (
    /^(?:companion\/|research\/|src\/(?:ai|experiments|scene|companion)\/|src\/app\/(?:ai|experiments)\/|tests\/(?:research|companion-browser)\/|docs\/(?:evidence|phase-01|phase-02)\/|docs\/phase-4)/.test(
      file,
    ) ||
    /^src\/components\/(?:ai-vision|companion-observations|evidence-insight)\.tsx$/.test(
      file,
    ) ||
    (file.startsWith("tests/") &&
      historicalTests.test(file.split("/").at(-1))) ||
    /^tests\/fixtures\/(?!phase01\/|exif\.ts)/.test(file) ||
    /^docs\/phase-03\/evidence\/(?!cloud-vision\.json$|commit-scope\.json$)/.test(
      file,
    ) ||
    (file.startsWith("scripts/") &&
      !/^scripts\/(?:cloud-|audit-cloud-|check-cloud-|run-next\.|verify-release\.|test-unit\.|prepare-commit-scope\.)/.test(
        file,
      ))
  )
    return "KEEP — Lightweight Research History";
  return file.startsWith("src/")
    ? "KEEP — Production Source"
    : "KEEP — Tests, Documentation and Configuration";
}
function inventory() {
  const tracked = paths("ls-files");
  const untracked = paths("ls-files", "--others", "--exclude-standard");
  const stagePaths = [
    ...new Set([
      ...paths("diff", "--name-only"),
      ...paths("diff", "--cached", "--name-only"),
      ...untracked,
    ]),
  ].sort();
  const files = [...new Set([...tracked, ...untracked])].sort().map((file) => {
    if (
      /^(?:\.env|\.cloud-ai\/|node_modules\/|\.next|companion\/vendor\/)/.test(
        file,
      ) ||
      /\.(?:onnx|gguf|safetensors|pth|bin|wasm|zip|exe|dll|pyc)$/.test(file)
    )
      throw Error("Excluded or runtime file is a Git candidate: " + file);
    if (lstatSync(file).isSymbolicLink())
      throw Error("Review symbolic link before staging: " + file);
    const bytes = readFileSync(file);
    if (bytes.length >= 100 * 1024 * 1024)
      throw Error("Oversized GitHub object: " + file);
    if (
      /AIza[0-9A-Za-z_-]{35}|nvapi-[0-9A-Za-z_-]{30,}|sk-proj-[0-9A-Za-z_-]{30,}/.test(
        bytes.toString("utf8"),
      )
    )
      throw Error("Potential credential; inspect privately: " + file);
    return {
      path: file,
      category: category(file),
      bytes: file === manifestPath ? null : bytes.length,
      sha256:
        file === manifestPath
          ? null
          : createHash("sha256").update(bytes).digest("hex"),
    };
  });
  return { stagePaths, files };
}
const mode = process.argv[2];
if (mode === "--write") {
  // Create first so the manifest is included in its own explicit path list.
  try {
    readFileSync(manifestPath);
  } catch {
    writeFileSync(manifestPath, "{}\n");
  }
  const current = inventory();
  const counts = {};
  for (const f of current.files)
    counts[f.category] = (counts[f.category] ?? 0) + 1;
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        version: 1,
        preparedAt: new Date().toISOString(),
        note: "Exact proposed commit scope. Every candidate is classified. This manifest alone has null bytes/hash to avoid a self-reference. --check validates all other bytes and rejects new paths. Review licensed fixture attribution and retained historical evidence before staging.",
        counts,
        ...current,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      prepared: manifestPath,
      candidates: current.files.length,
      changedPaths: current.stagePaths.length,
      counts,
    }),
  );
} else if (["--check", "--pathspec"].includes(mode)) {
  const saved = JSON.parse(readFileSync(manifestPath, "utf8"));
  const current = inventory();
  if (
    JSON.stringify(saved.files) !== JSON.stringify(current.files) ||
    JSON.stringify(saved.stagePaths) !== JSON.stringify(current.stagePaths)
  )
    throw Error(
      "Commit scope or file bytes changed. Review differences before regenerating the manifest.",
    );
  if (mode === "--pathspec") {
    mkdirSync(".cloud-ai", { recursive: true });
    writeFileSync(
      ".cloud-ai/commit-paths.nul",
      Buffer.from(saved.stagePaths.join("\0") + "\0", "utf8"),
    );
  }
  console.log(
    JSON.stringify({
      verified: true,
      candidates: current.files.length,
      changedPaths: current.stagePaths.length,
      stagedByThisTool: false,
    }),
  );
} else
  throw Error("Use --write, --check or --pathspec. No mode stages or commits.");
