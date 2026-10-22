export type SiteArea = "studio" | "store" | "admin";

export function resolveDomainHost(host: string | null): SiteArea {
  const value = (host || "").toLowerCase();
  if (value.startsWith("admin.")) return "admin";
  if (value.startsWith("store.")) return "store";
  return "studio";
}

export function domainOrigin(area: SiteArea): string {
  if (area === "admin") return process.env.NEXT_PUBLIC_ADMIN_URL || "https://admin.zerocraft.in";
  if (area === "store") return process.env.NEXT_PUBLIC_STORE_URL || "https://store.zerocraft.in";
  return process.env.NEXT_PUBLIC_STUDIO_URL || "https://zerocraft.in";
}
