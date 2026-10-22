import type { NextConfig } from "next";
const research = process.env.HIDDEN_DATA_BUILD_TARGET === "research";
const config: NextConfig = {
  poweredByHeader: false,
  typescript: {
    tsconfigPath:
      !research && process.env.NODE_ENV === "production"
        ? "tsconfig.production.json"
        : "tsconfig.json",
  },
  distDir: research ? ".next-research" : ".next",
  pageExtensions: research
    ? ["tsx", "ts", "research.tsx", "research.ts"]
    : ["tsx", "ts"],
};
export default config;
