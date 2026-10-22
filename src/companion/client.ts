import { decodeImage } from "@/analysis/files";
export const COMPANION_ADDRESS = "http://127.0.0.1:18431";
export async function companionRequest(
  operation: "pair" | "status" | "analyze" | "cancel" | "disconnect",
  body: unknown,
  token: string | null,
  signal?: AbortSignal,
): Promise<unknown> {
  const response = await fetch(`${COMPANION_ADDRESS}/v1/${operation}`, {
    method: operation === "status" ? "GET" : "POST",
    headers: {
      ...(operation === "status" ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(operation === "status" ? {} : { body: JSON.stringify(body) }),
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
    referrerPolicy: "no-referrer",
    signal: AbortSignal.any([
      AbortSignal.timeout(operation === "analyze" ? 185_000 : 8_000),
      ...(signal ? [signal] : []),
    ]),
  });
  const reader = response.body?.getReader();
  if (!reader) throw Error("The local companion did not return a response.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65_536)
        throw Error("The companion response exceeded its limit.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const raw = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    raw.set(chunk, offset);
    offset += chunk.length;
  }
  const value: unknown = JSON.parse(new TextDecoder().decode(raw));
  if (!response.ok) {
    // Server errors remain generic: never display paths or arbitrary local-server text.
    if (response.status === 401)
      throw Error(
        "Pairing expired or was not accepted. Generate a new code in the companion.",
      );
    if (response.status === 409)
      throw Error(
        "The model is stopped or busy. Check the companion, then retry.",
      );
    if (response.status === 422)
      throw Error(
        "The model response was incomplete or malformed. No observations were accepted.",
      );
    throw Error(
      "The companion could not complete the request. Check its status and restart the model if needed.",
    );
  }
  return value;
}

export async function companionPixels(
  url: string,
  signal: AbortSignal,
): Promise<string> {
  const image = await decodeImage(url, signal);
  const canvas = document.createElement("canvas");
  try {
    signal.throwIfAborted();
    const scale = Math.min(
      1,
      1536 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw Error("The bounded image preview could not be prepared.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    // A new canvas encoding carries pixels, never the source file or its EXIF/GPS.
    const pixels = canvas.toDataURL("image/png");
    signal.throwIfAborted();
    if (
      !pixels.startsWith("data:image/png;base64,") ||
      pixels.length > 13_981_038
    )
      throw Error("The preview exceeds the companion image limit.");
    return pixels.slice("data:image/png;base64,".length);
  } finally {
    image.src = "";
    canvas.width = canvas.height = 0;
  }
}
