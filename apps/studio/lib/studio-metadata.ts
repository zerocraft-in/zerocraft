import type { Metadata } from "next";
import { studio } from "./studio-config";

export function studioMetadata(title: string, description: string, path: string): Metadata {
  const canonical = `${studio.url}${path}`;
  return {
    title,
    description,
    keywords: [
      "Zerocraft Studio",
      "Manimaran",
      "Manimaran creative director",
      "creative studio Tamil Nadu",
      "branding studio India",
      "digital design studio",
      "web design and development",
      "premium brand identity",
      "creative director Tenkasi",
    ],
    alternates: { canonical },
    authors: [{ name: "Manimaran", url: studio.url }],
    creator: "Manimaran",
    publisher: studio.name,
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: studio.name,
      type: "website",
      images: [{ url: "/android-chrome-512x512.png", width: 512, height: 512, alt: `${title} — ${studio.name}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/android-chrome-512x512.png"],
    },
  };
}
