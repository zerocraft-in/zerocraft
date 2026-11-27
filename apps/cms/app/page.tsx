import { redirect } from "next/navigation";
import { platformUser, PlatformError } from "@/lib/platform/server";
import { redirectToStoreEntry } from "@/lib/platform/entry-route";

export default async function EcommerceRootPage() {
  try {
    const { client } = await platformUser();
    await redirectToStoreEntry(client);
  } catch (error) {
    if (error instanceof PlatformError && error.status === 401) {
      redirect("/login?next=%2F");
    }
    throw error;
  }
}
