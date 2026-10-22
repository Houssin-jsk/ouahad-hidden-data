import { GEMINI_TIMEOUT_MS, validateObservations } from "../../contract";
import { providerJson } from "../http";
import { OUTPUT_SCHEMA, VISION_PROMPT } from "../prompt";
import { ProviderFailure, type ProviderAdapter } from "../types";
export function geminiAdapter(
  key: string,
  eligibility: ProviderAdapter["eligibility"],
  constraints: ProviderAdapter["constraints"],
  model:
    "gemini-3.5-flash-lite" | "gemini-3.1-flash-lite" = "gemini-3.5-flash-lite",
): ProviderAdapter {
  return {
    id: "gemini",
    model,
    priority: model === "gemini-3.5-flash-lite" ? 1 : 2,
    eligibility,
    constraints,
    async run(image, signal) {
      const value = (await providerJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        { "x-goog-api-key": key },
        {
          contents: [
            {
              parts: [
                { text: VISION_PROMPT },
                {
                  inlineData: {
                    mimeType: image.mime,
                    data: Buffer.from(image.bytes).toString("base64"),
                  },
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: constraints.outputTokens,
            temperature: 0,
            thinkingConfig: { thinkingLevel: "minimal" },
            responseMimeType: "application/json",
            responseSchema: OUTPUT_SCHEMA,
          },
        },
        signal,
        undefined,
        GEMINI_TIMEOUT_MS,
      )) as {
        promptFeedback?: { blockReason?: string };
        candidates?: {
          finishReason?: string;
          content?: { parts?: { text?: string; thought?: boolean }[] };
        }[];
        usageMetadata?: {
          promptTokenCount?: number;
          candidatesTokenCount?: number;
          totalTokenCount?: number;
        };
      };
      const candidate = value.candidates?.[0];
      if (
        value.promptFeedback?.blockReason ||
        [
          "SAFETY",
          "RECITATION",
          "PROHIBITED_CONTENT",
          "SPII",
          "BLOCKLIST",
        ].includes(candidate?.finishReason ?? "")
      )
        throw new ProviderFailure("safety_refusal");
      if (candidate?.finishReason !== "STOP")
        throw new ProviderFailure("invalid_output");
      try {
        const observations = validateObservations(
          JSON.parse(
            candidate.content?.parts
              ?.filter((p) => !p.thought)
              .map((p) => p.text ?? "")
              .join("") ?? "",
          ),
        );
        const inputTokens = value.usageMetadata?.promptTokenCount;
        const outputTokens = value.usageMetadata?.candidatesTokenCount;
        return {
          observations,
          usage: {
            inputTokens:
              Number.isSafeInteger(inputTokens) && inputTokens! >= 0
                ? inputTokens
                : undefined,
            outputTokens:
              Number.isSafeInteger(outputTokens) && outputTokens! >= 0
                ? outputTokens
                : undefined,
            totalTokens: Number.isSafeInteger(
              value.usageMetadata?.totalTokenCount,
            )
              ? value.usageMetadata?.totalTokenCount
              : undefined,
          },
        };
      } catch {
        throw new ProviderFailure("invalid_output");
      }
    },
  };
}
