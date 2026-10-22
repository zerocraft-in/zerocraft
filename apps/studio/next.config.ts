import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    cpus: 1,
    workerThreads: false,
    webpackBuildWorker: false,
  },
  distDir: process.env.VERCEL ? ".next" : ".next-local",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["@zerocraft/supabase"],
};

export default nextConfig;
