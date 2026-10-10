import { studio } from "@/lib/studio-config";
import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = studio.url;

  return [
    ...["about", "services", "works", "contact"].map((path) => ({
      url: `${baseUrl}/${path}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    {
      url: `${baseUrl}`,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/store`,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];
}
