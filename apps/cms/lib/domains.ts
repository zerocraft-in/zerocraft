export type DomainArea = "studio" | "store" | "admin" | "preview" | "unknown";

export const DOMAIN_HOSTS = {
  studio: "zerocraft.in",
  store: "store.zerocraft.in",
  admin: "admin.zerocraft.in",
} as const;

type PublicDomainEnv =
  | "NEXT_PUBLIC_STUDIO_URL"
  | "NEXT_PUBLIC_STORE_URL"
  | "NEXT_PUBLIC_ADMIN_URL";

function configuredOrigin(key: PublicDomainEnv, fallbackHost: string) {
  const value = process.env[key];
  if (!value) return `https://${fallbackHost}`;
  try {
    return new URL(value).origin;
  } catch {
    return `https://${fallbackHost}`;
  }
}

export function domainOrigin(area: Exclude<DomainArea, "preview" | "unknown">) {
  const key: Record<typeof area, PublicDomainEnv> = {
    studio: "NEXT_PUBLIC_STUDIO_URL",
    store: "NEXT_PUBLIC_STORE_URL",
    admin: "NEXT_PUBLIC_ADMIN_URL",
  };
  return configuredOrigin(key[area], DOMAIN_HOSTS[area]);
}

export function domainUrl(
  area: Exclude<DomainArea, "preview" | "unknown">,
  path = "/",
) {
  const url = new URL(path, domainOrigin(area));
  return `${url.origin}${url.pathname}${url.search}${url.hash}`;
}

export function domainUrlForRequest(
  area: Exclude<DomainArea, "preview" | "unknown">,
  requestUrl: URL,
  path = "/",
  sourceHost?: string,
) {
  const requestHost = hostWithoutPort(sourceHost || requestUrl.hostname);
  const isLocal =
    requestHost === "localhost" ||
    requestHost === "127.0.0.1" ||
    requestHost === "[::1]" ||
    requestHost.endsWith(".localhost") ||
    requestHost.endsWith(".127.0.0.1");
  if (isLocal) {
    const port = requestUrl.port ? `:${requestUrl.port}` : "";
    const localHost = area === "studio" ? "localhost" : `${area}.localhost`;
    const localUrl = new URL(`${requestUrl.protocol}//${localHost}${port}`);
    const target = new URL(path, localUrl);
    return `${target.origin}${target.pathname}${target.search}${target.hash}`;
  }
  return domainUrl(area, path);
}

export function hostWithoutPort(value: string) {
  return value.toLowerCase().replace(/:\d+$/, "");
}

function isVercelPreviewHost(host: string) {
  return host.endsWith(".vercel.app") || host.endsWith(".vercel.sh");
}

export function resolveDomainHost(
  rawHost: string | null | undefined,
): DomainArea {
  const host = hostWithoutPort(rawHost || "");
  if (!host) return "unknown";

  if (host === DOMAIN_HOSTS.studio || host === `www.${DOMAIN_HOSTS.studio}`)
    return "studio";
  if (host === DOMAIN_HOSTS.store) return "store";
  if (host === DOMAIN_HOSTS.admin) return "admin";

  if (host === "store.localhost" || host === "store.127.0.0.1") return "store";
  if (host === "admin.localhost" || host === "admin.127.0.0.1") return "admin";
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]")
    return "studio";

  const previewHosts = [
    process.env.VERCEL_URL,
    process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL,
  ]
    .filter(Boolean)
    .map((value) => hostWithoutPort(value as string));
  if (previewHosts.includes(host) || isVercelPreviewHost(host))
    return "preview";

  return "unknown";
}

export function isAllowedHost(rawHost: string | null | undefined) {
  return resolveDomainHost(rawHost) !== "unknown";
}

export function isSafeReturnPath(
  value: string | null | undefined,
  fallback = "/",
) {
  if (!value || !value.startsWith("/") || value.startsWith("//"))
    return fallback;
  return value;
}

export function storeRoute(path: string) {
  return path === "/"
    ? "/"
    : path.startsWith("/store")
      ? path
      : `/store${path}`;
}

export function adminRoute(path: string) {
  return path === "/"
    ? "/studio"
    : path === "/store" || path.startsWith("/store/")
      ? `/studio${path}`
      : path.startsWith("/studio")
        ? path
        : `/studio${path}`;
}

export function storeHref(path: string) {
  if (path === "/store" || path === "/") return "/";
  return path.startsWith("/store/") ? path.slice("/store".length) : path;
}

export function adminHref(path: string) {
  if (path === "/studio" || path === "/") return "/";
  return path.startsWith("/studio/") ? path.slice("/studio".length) : path;
}
