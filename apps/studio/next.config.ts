import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDirectory = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = (phase: string): NextConfig => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    turbopack: {},
    experimental: isDev
      ? {}
      : {
          cpus: 1,
          workerThreads: false,
          webpackBuildWorker: false,
        },
    distDir: process.env.VERCEL ? ".next" : ".next-local",
    outputFileTracingRoot: path.join(configDirectory, "../.."),
    images: {
      remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
    },
    transpilePackages: ["@zerocraft/supabase", "@zerocraft/ui", "@zerocraft/tailwind-config"],
  };
};

export default nextConfig;
