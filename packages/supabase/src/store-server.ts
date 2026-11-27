import "server-only";
import { headers } from "next/headers";
import { getSupabasePublicConfig, storeConnections } from "./config";

export async function getRequestStoreConfig() {
  const requestHeaders = await headers();
  const config = getSupabasePublicConfig(requestHeaders.get("host") || "");
  let serviceKey: string | undefined;
  if (storeConnections().length) {
    const secrets: Record<string, { serviceRoleKey?: string }> = JSON.parse(process.env.STORE_SERVER_SECRETS || "{}");
    serviceKey = secrets[config.storeId]?.serviceRoleKey;
  } else serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Never fall back to a different store's service key.
  return { ...config, serviceKey };
}
