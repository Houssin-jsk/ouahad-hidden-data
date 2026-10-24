import type { NextConfig } from "next";
const research = process.env.HIDDEN_DATA_BUILD_TARGET === "research";
const config: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
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
