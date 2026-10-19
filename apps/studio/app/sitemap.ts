import { studio } from "@/lib/studio-config";
import { MetadataRoute } from "next";
import { headers } from "next/headers";
import { domainOrigin, resolveDomainHost } from "@/lib/domains";
import { getCategories, getProducts } from "@/lib/commerce/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const area = resolveDomainHost((await headers()).get("host"));
  if (area === "admin") return [];
  const baseUrl = area === "store" ? domainOrigin("store") : studio.url;

  if (area === "store") {
    const [categories, products] = await Promise.all([getCategories(), getProducts({ page: 1, pageSize: 48 })]);
    const staticEntries = ["", "shop", "about", "contact"].map((path) => ({
      url: `${baseUrl}/${path}`.replace(/\/$/, path ? "" : "/"),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    }));
    const categoryEntries = categories.flatMap((category) => [
      { url: `${baseUrl}/category/${category.slug}`, changeFrequency: "weekly" as const, priority: 0.7 },
      ...category.subcategories.map((subcategory) => ({ url: `${baseUrl}/category/${category.slug}?subcategory=${subcategory.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
    ]);
    const productEntries = products.products.map((product) => ({ url: `${baseUrl}/product/${product.id}`, changeFrequency: "weekly" as const, priority: 0.6 }));
    return [...staticEntries, ...categoryEntries, ...productEntries];
  }

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
