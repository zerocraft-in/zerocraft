import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {},
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["@zerocraft/supabase"],
  async rewrites() {
    return [
      { source: "/store", destination: "/" },
      { source: "/store/:path*", destination: "/:path*" },
    ];
  },
};

export default nextConfig;
