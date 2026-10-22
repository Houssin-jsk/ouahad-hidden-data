import path from "node:path";
import { realpath, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

/** Research-only model file serving; route files are absent from the release build. */
export async function researchAsset(
  group: "ai" | "experiments/ai",
  segments: string[],
) {
  if (process.env.HIDDEN_DATA_BUILD_TARGET !== "research")
    return new Response(null, { status: 404 });
  if (
    !segments.length ||
    segments.some(
      (s) => s === "." || s === ".." || !/^[a-zA-Z0-9_.-]+$/.test(s),
    )
  )
    return new Response(null, { status: 404 });
  try {
    const root = await realpath(
      path.join(process.cwd(), "research/assets", group),
    );
    const file = await realpath(path.join(root, ...segments));
    const relative = path.relative(root, file);
    if (relative.startsWith("..") || path.isAbsolute(relative))
      return new Response(null, { status: 404 });
    const info = await stat(file);
    if (!info.isFile()) return new Response(null, { status: 404 });
    const mime: Record<string, string> = {
      ".json": "application/json",
      ".mjs": "text/javascript",
      ".wasm": "application/wasm",
      ".txt": "text/plain",
    };
    return new Response(
      Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>,
      {
        headers: {
          "Content-Type":
            mime[path.extname(file)] ?? "application/octet-stream",
          "Content-Length": String(info.size),
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch {
    return new Response(null, { status: 404 });
  }
}
