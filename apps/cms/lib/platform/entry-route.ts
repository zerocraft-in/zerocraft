import { redirect } from "next/navigation";
import type { platformUser } from "@/lib/platform/server";

type PlatformClient = Awaited<ReturnType<typeof platformUser>>["client"];

/** Select the right landing page for the signed-in owner account. */
export async function storeEntryRoute(client: PlatformClient) {
  const { data: stores, error } = await client
    .from("stores")
    .select("slug,status,setup_completed_at")
    .order("created_at", { ascending: true });

  if (error) throw new Error("Your stores could not be loaded.");
  if (!stores || stores.length !== 1) return "/stores";

  const store = stores[0];
  if (["suspended", "archived"].includes(store.status)) return "/stores";
  return store.setup_completed_at
    ? `/store/${store.slug}`
    : `/store/${store.slug}/setup`;
}

export async function redirectToStoreEntry(client: PlatformClient) {
  redirect(await storeEntryRoute(client));
}
