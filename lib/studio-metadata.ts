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
      images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Zerocraft Studio — Independent Creative & Digital Studio" }],
    },
    twitter: { card: "summary_large_image", title: ogTitle, description: ogDescription, images: ["/og-image.jpg"] },
  };
}
