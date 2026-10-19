import type { NextConfig } from "next";
import path from "node:path";

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
  outputFileTracingRoot: path.join(__dirname, "../.."),
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
