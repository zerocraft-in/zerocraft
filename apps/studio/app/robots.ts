import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { resolveDomainHost, domainOrigin } from "@/lib/domains";
import { studio } from "@/lib/studio-config";
export default async function robots(): Promise<MetadataRoute.Robots> {
  const area = resolveDomainHost((await headers()).get("host"));
  if (area === "admin") {
    return { rules: { userAgent: "*", disallow: "/" }, host: domainOrigin("admin") };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/studio/", "/auth/", "/api/"],
    },
    sitemap: `${domainOrigin("studio")}/sitemap.xml`,
    host: studio.url,
  };
}
