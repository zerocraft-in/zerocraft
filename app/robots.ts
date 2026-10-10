import type { MetadataRoute } from "next";
import { studio } from "@/lib/studio-config";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/studio/", "/auth/", "/api/", "/store/account", "/store/cart", "/store/checkout"] },
    sitemap: `${studio.url}/sitemap.xml`, host: studio.url,
  };
}
