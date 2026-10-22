import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
const releaseDistDirectory = process.env.CMS_BUILD_DIR?.trim();

const supabaseHostname = (() => {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) return null;
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    cpus: 1,
    workerThreads: false,
    webpackBuildWorker: false,
  },
  distDir: releaseDistDirectory || (process.env.VERCEL ? ".next" : ".next-local"),
  ...(releaseDistDirectory
    ? {
        experimental: {
          cpus: 1,
          workerThreads: false,
          webpackBuildWorker: false,
        },
      }
    : {}),
  outputFileTracingRoot: path.join(configDirectory, "../.."),
  transpilePackages: ["@zerocraft/supabase"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "flagcdn.com",
      },
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
