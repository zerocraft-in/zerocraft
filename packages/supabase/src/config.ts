export type StoreConnection = { id: string; name: string; adminOrigin: string; storefrontOrigin: string; url: string; key: string; adminAliases?: string[]; storefrontAliases?: string[] };

export function storeConnections(): StoreConnection[] {
  const raw = process.env.NEXT_PUBLIC_STORE_CONNECTIONS;
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.length) throw new Error("Store connections must be a non-empty array.");
  const ids = new Set<string>(); const hosts = new Set<string>(); const projects = new Set<string>();
  return parsed.map(value => {
    const store = value as StoreConnection;
    if (!store || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(store.id) || typeof store.name !== "string" || !store.name.trim() || typeof store.key !== "string" || !store.key || store.key.startsWith("sb_secret_")) throw new Error("Invalid public store connection.");
    const allowedKeys = new Set(["id","name","adminOrigin","storefrontOrigin","url","key","adminAliases","storefrontAliases"]);
    if (Object.keys(store).some(key => !allowedKeys.has(key))) throw new Error("Only public connection fields are permitted in the store registry.");
    if (!store.key.startsWith("sb_publishable_") && store.key.split(".").length !== 3) throw new Error("Store connections require public publishable/anon keys.");
    // Legacy JWT keys must be anon keys, never service_role keys.
    if (store.key.split(".").length === 3) {
      try { const segment = store.key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); if (JSON.parse(atob(segment)).role !== "anon") throw new Error(); } catch { throw new Error("Store connections require public publishable/anon keys."); }
    }
    const url = new URL(store.url); const admin = new URL(store.adminOrigin); const storefront = new URL(store.storefrontOrigin);
    for (const origin of [url, admin, storefront]) if (origin.username || origin.password || (origin.protocol !== "https:" && !(origin.protocol === "http:" && /^(localhost|127\.0\.0\.1|.*\.localhost)$/.test(origin.hostname)))) throw new Error("Store URLs require HTTPS (localhost may use HTTP).");
    const aliases = [...(store.adminAliases || []), ...(store.storefrontAliases || [])];
    const localHosts = new Set([admin.host, storefront.host]);
    for (const value of aliases) {
      const alias = new URL(value);
      if (alias.username || alias.password || alias.pathname !== "/" || alias.search || alias.hash || (alias.protocol !== "https:" && !(alias.protocol === "http:" && /^(localhost|127\.0\.0\.1|.*\.localhost)$/.test(alias.hostname)))) throw new Error("Invalid store host alias.");
      if (localHosts.has(alias.host) || hosts.has(alias.host)) throw new Error("Stores require unique host aliases.");
      localHosts.add(alias.host);
    }
    if (ids.has(store.id) || projects.has(url.origin) || admin.host === storefront.host || hosts.has(admin.host) || hosts.has(storefront.host)) throw new Error("Stores require unique IDs, Supabase projects, and admin/storefront hosts.");
    ids.add(store.id); projects.add(url.origin); for (const host of localHosts) hosts.add(host);
    return { id: store.id, name: store.name.trim(), adminOrigin: admin.origin, storefrontOrigin: storefront.origin, url: url.origin, key: store.key, adminAliases: store.adminAliases, storefrontAliases: store.storefrontAliases };
  });
}

export function connectionForHost(host: string, stores = storeConnections()): StoreConnection | null {
  if (!stores.length) return null;
  const normalized = host.trim().toLowerCase();
  const store = stores.find(item => new URL(item.adminOrigin).host === normalized || new URL(item.storefrontOrigin).host === normalized || [...(item.adminAliases || []), ...(item.storefrontAliases || [])].some(alias => new URL(alias).host === normalized));
  if (!store) throw new Error("This host is not assigned to a store.");
  return store;
}

export function getSupabasePublicConfig(host?: string) {
  const stores = storeConnections();
  const connection = stores.length ? (host !== undefined || typeof window !== "undefined" ? connectionForHost(host !== undefined ? host : window.location.host, stores) : stores[0]) : null;
  if (connection) return { url: connection.url, key: connection.key, storeId: connection.id };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase public configuration is missing.");
  return { url, key, storeId: process.env.NEXT_PUBLIC_STORE_ID || "zerocraft" };
}
