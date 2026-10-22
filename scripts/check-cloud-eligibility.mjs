// Read-only account checks. Never emit raw provider bodies, IDs or credentials.
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const cf = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}`;
const checks = [
  [
    "gemini",
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite",
    { "x-goog-api-key": process.env.GEMINI_API_KEY },
  ],
  [
    "gemini31",
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite",
    { "x-goog-api-key": process.env.GEMINI_API_KEY },
  ],
  [
    "nvidia",
    "https://integrate.api.nvidia.com/v1/models",
    { Authorization: `Bearer ${process.env.NVIDIA_API_KEY}` },
  ],
  [
    "cloudflare-token",
    "https://api.cloudflare.com/client/v4/user/tokens/verify",
    { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` },
  ],
  [
    "cloudflare-subscriptions",
    `${cf}/subscriptions`,
    { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` },
  ],
  [
    "cloudflare-d1",
    `${cf}/d1/database`,
    { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` },
  ],
  [
    "cloudflare-models",
    `${cf}/ai/models/search?search=vision`,
    { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` },
  ],
];
for (const [name, url, headers] of checks) {
  try {
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(12000),
    });
    const data = await res.json();
    const safe = { name, status: res.status };
    if (name.startsWith("gemini") && res.ok)
      Object.assign(safe, {
        model: data.name,
        methods: data.supportedGenerationMethods,
        inputTokens: data.inputTokenLimit,
        outputTokens: data.outputTokenLimit,
      });
    if (name === "nvidia" && res.ok)
      safe.visionModels = data.data
        ?.filter((m) =>
          /vision|llama-3.2|llava|qwen.*vl|nemotron.*vl/i.test(m.id),
        )
        .map((m) => m.id);
    if (name === "cloudflare-token") safe.tokenStatus = data.result?.status;
    if (name === "cloudflare-subscriptions" && res.ok)
      safe.plans = data.result?.map((s) => ({
        price: s.price,
        ratePlan: s.rate_plan?.id,
        publicName: s.rate_plan?.public_name,
        state: s.state,
      }));
    if (name === "cloudflare-d1" && res.ok)
      safe.databaseCount = data.result?.length;
    if (name === "cloudflare-models" && res.ok)
      safe.models = data.result?.map((m) => ({
        name: m.name,
        task: m.task?.name,
      }));
    if (!res.ok)
      safe.errorCodes = data.errors?.map((e) => e.code) ?? data.error?.status;
    console.log(JSON.stringify(safe));
  } catch {
    console.log(JSON.stringify({ name, error: "network_or_timeout" }));
  }
}
