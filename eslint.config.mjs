import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".next-research/**",
    "test-results/**",
    "research-test-results/**",
    "playwright-report/**",
    ".cloud-ai/**",
    "next-env.d.ts",
    "research/assets/ai/runtime/**",
  ]),
]);
