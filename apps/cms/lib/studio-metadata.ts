import type { Metadata } from "next";
import { studio } from "./studio-config";

export function studioMetadata(title: string, description: string, path: string, ogTitle = title, ogDescription = description): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: new URL(path, studio.url).href },
    openGraph: {
      title: ogTitle, description: ogDescription, url: new URL(path, studio.url).href,
      siteName: "Zerocraft Studio", locale: "en_IN", type: "website",
      images: [{ url: "/hero-designer.png", alt: "Zerocraft Studio — Creative & Digital Studio" }],
    },
    twitter: { card: "summary_large_image", title: ogTitle, description: ogDescription, images: ["/hero-designer.png"] },
  };
}
