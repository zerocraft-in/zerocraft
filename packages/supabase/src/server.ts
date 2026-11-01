import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getRequestStoreConfig } from "./store-server";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = await getRequestStoreConfig();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot always mutate cookies; proxy refresh handles it.
        }
      },
    },
  });
}
