import "server-only";

import { getRequestStoreConfig } from "@zerocraft/supabase/store-server";
import { createClient } from "@supabase/supabase-js";

export async function createServiceClient() {
  const { url, serviceKey: key } = await getRequestStoreConfig();
  if (!url || !key) throw new Error("Supabase service credentials are not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
