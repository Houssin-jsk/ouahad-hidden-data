import { validateObservations } from "../../contract";
import { classifyHttp, providerJson, retryAt } from "../http";
import { VISION_PROMPT } from "../prompt";
import { ProviderFailure, type ProviderAdapter } from "../types";
export function classifyCloudflare(response: Response, body: unknown) {
  const codes =
    (body as { errors?: { code?: number }[] })?.errors?.map((e) => e.code) ??
    [];
  if (codes.includes(3036))
    return new ProviderFailure(
      "quota_exhausted",
      retryAt(response.headers, body) ??
        (Math.floor(Date.now() / 86400000) + 1) * 86400000,
    );
  if (codes.includes(3040)) return new ProviderFailure("outage");
  if (codes.includes(5035)) return new ProviderFailure("billing_required");
  if (codes.some((code) => [5007, 3042, 5016, 5018, 3041].includes(code ?? 0)))
    return new ProviderFailure("model_unavailable");
  if (codes.includes(3007)) return new ProviderFailure("timeout");
  if (codes.includes(3008)) return new ProviderFailure("cancelled");
  return classifyHttp(response, body);
}
export function cloudflareAdapter(
  account: string,
  token: string,
  eligibility: ProviderAdapter["eligibility"],
  constraints: ProviderAdapter["constraints"],
): ProviderAdapter {
  return {
    id: "cloudflare",
    model: "@cf/meta/llama-3.2-11b-vision-instruct",
    eligibility,
    constraints,
    async run(image, signal) {
      const value = (await providerJson(
        `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
        { authorization: `Bearer ${token}` },
        {
          prompt: VISION_PROMPT,
          image: Array.from(image.bytes),
          max_tokens: constraints.outputTokens,
          temperature: 0,
          stream: false,
        },
        signal,
        classifyCloudflare,
      )) as { success?: boolean; result?: { response?: string } };
      if (value.success !== true) throw new ProviderFailure("outage");
      try {
        return {
          observations: validateObservations(
            JSON.parse(value.result?.response ?? ""),
          ),
        };
      } catch {
        throw new ProviderFailure("invalid_output");
      }
    },
  };
}
