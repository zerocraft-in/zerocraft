import { studio } from "@/lib/studio-config";
import { MetadataRoute } from "next";
import { headers } from "next/headers";
import { domainOrigin, resolveDomainHost } from "@/lib/domains";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const area = resolveDomainHost((await headers()).get("host"));
  if (area === "admin") return [];
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
  ];
}
