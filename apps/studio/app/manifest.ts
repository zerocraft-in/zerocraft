import type { MetadataRoute } from "next";
import { studio } from "@/lib/studio-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: studio.name,
    short_name: "Zerocraft",
    description: studio.description,
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
