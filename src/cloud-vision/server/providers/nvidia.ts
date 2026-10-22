import { validateObservations } from "../../contract";
import { providerJson } from "../http";
import { VISION_PROMPT } from "../prompt";
import { ProviderFailure, type ProviderAdapter } from "../types";
export function nvidiaAdapter(
  key: string,
  constraints: ProviderAdapter["constraints"],
): ProviderAdapter {
  return {
    id: "nvidia",
    model: "meta/llama-3.2-11b-vision-instruct",
    constraints,
    eligibility: {
      enabled: false,
      reason:
        "Developer Program hosted access is for testing; production rights are not authorized.",
    },
    async run(image, signal) {
      const value = (await providerJson(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        { authorization: `Bearer ${key}` },
        {
          model: "meta/llama-3.2-11b-vision-instruct",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: VISION_PROMPT },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${image.mime};base64,${Buffer.from(image.bytes).toString("base64")}`,
                  },
                },
              ],
            },
          ],
          max_tokens: constraints.outputTokens,
          temperature: 0,
          stream: false,
        },
        signal,
      )) as {
        choices?: {
          finish_reason?: string;
          message?: { content?: string; refusal?: string };
        }[];
      };
      const choice = value.choices?.[0];
      if (
        choice?.message?.refusal ||
        choice?.finish_reason === "content_filter"
      )
        throw new ProviderFailure("safety_refusal");
      if (choice?.finish_reason !== "stop")
        throw new ProviderFailure("invalid_output");
      try {
        return {
          observations: validateObservations(
            JSON.parse(choice.message?.content ?? ""),
          ),
        };
      } catch {
        throw new ProviderFailure("invalid_output");
      }
    },
  };
}
