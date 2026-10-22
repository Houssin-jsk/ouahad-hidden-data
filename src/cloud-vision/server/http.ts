import { ProviderFailure } from "./types";

export async function boundedJson(
  response: Response,
  maxBytes = 32768,
  signal?: AbortSignal,
): Promise<unknown> {
  if (!response.body) throw new ProviderFailure("invalid_output");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  const abort = () => {
    void reader.cancel().catch(() => {});
  };
  signal?.addEventListener("abort", abort, { once: true });
  let length = 0;
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      length += value.length;
      if (length > maxBytes) throw new ProviderFailure("invalid_output");
      chunks.push(value);
    }
    const buffer = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }
    try {
      return JSON.parse(new TextDecoder().decode(buffer));
    } catch {
      throw new ProviderFailure("invalid_output");
    }
  } finally {
    signal?.removeEventListener("abort", abort);
    await reader.cancel().catch(() => {});
  }
}
export function retryAt(
  headers: Headers,
  body: unknown,
  now = Date.now(),
): number | undefined {
  const header = headers.get("retry-after");
  if (header) {
    const time = /^\d+(\.\d+)?$/.test(header)
      ? now + Number(header) * 1000
      : Date.parse(header);
    if (
      Number.isFinite(time) &&
      time > now &&
      Number.isSafeInteger(Math.ceil(time))
    )
      return Math.ceil(time);
  }
  const error = (
    body as {
      error?: { details?: { "@type"?: string; retryDelay?: string }[] };
    }
  )?.error;
  const delay = error?.details?.find(
    (d) => d["@type"] === "type.googleapis.com/google.rpc.RetryInfo",
  )?.retryDelay;
  if (delay && /^\d+(\.\d+)?s$/.test(delay)) {
    const time = now + Number(delay.slice(0, -1)) * 1000;
    if (Number.isSafeInteger(Math.ceil(time))) return Math.ceil(time);
  }
}
export function classifyHttp(
  response: Response,
  body: unknown,
): ProviderFailure {
  // Error text is used only for classification and is never returned or logged.
  const text = JSON.stringify(body).slice(0, 32768);
  if (response.status === 429)
    return new ProviderFailure(
      /quota|resource_exhausted|neuron.*limit/i.test(text)
        ? "quota_exhausted"
        : "rate_limited",
      retryAt(response.headers, body),
      /per.?day|\brpd\b/i.test(text)
        ? "day"
        : /per.?minute|\brpm\b|\btpm\b/i.test(text)
          ? "minute"
          : "unknown",
    );
  if (
    /billing|payment.required|credit.*exhausted/i.test(text) ||
    response.status === 402
  )
    return new ProviderFailure("billing_required");
  if (response.status === 401 || response.status === 403)
    return new ProviderFailure("invalid_credentials");
  if (
    /API_KEY_INVALID|API_KEY_EXPIRED|API key not valid|invalid api.?key/i.test(
      text,
    )
  )
    return new ProviderFailure("invalid_credentials");
  if (response.status === 404) return new ProviderFailure("model_unavailable");
  if (response.status >= 500) return new ProviderFailure("outage");
  if (/safety|blocked|refus/i.test(text))
    return new ProviderFailure("safety_refusal");
  if (
    response.status === 413 ||
    response.status === 415 ||
    response.status === 422
  )
    return new ProviderFailure("invalid_image");
  if (response.status === 400)
    return new ProviderFailure(
      /image|jpeg|mime|decode/i.test(text)
        ? "invalid_image"
        : "invalid_request",
    );
  return new ProviderFailure("outage");
}
export async function providerJson(
  url: string,
  headers: HeadersInit,
  body: unknown,
  signal: AbortSignal,
  classify = classifyHttp,
  timeoutMs = 12000,
): Promise<unknown> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const combined = AbortSignal.any([signal, timeout]);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: combined,
      cache: "no-store",
      redirect: "error",
    });
    const value = await boundedJson(response, 32768, combined);
    if (!response.ok) throw classify(response, value);
    return value;
  } catch (error) {
    if (signal.aborted)
      throw new ProviderFailure(
        signal.reason?.name === "TimeoutError" ? "timeout" : "cancelled",
      );
    if (timeout.aborted) throw new ProviderFailure("timeout");
    if (error instanceof ProviderFailure) throw error;
    throw new ProviderFailure("outage");
  }
}
