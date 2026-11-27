"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePermission } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const publicationSchema = z.object({
  productId: z.string().uuid(),
  channelKeys: z.array(z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/)).max(32),
});

export type PublicationResult = { ok: true } | { ok: false; error: string };

export async function syncProductChannelPublications(input: unknown): Promise<PublicationResult> {
  const context = await requirePermission("sales_channels.publish");
  const parsed = publicationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid publishing selection." };

  if (!context.activeOrganization) {
    return { ok: false, error: "No active organization." };
  }

  const organizationId = context.activeOrganization.id;
  const supabase = await createServerSupabaseClient();

  // Load channels from the sales_channels registry.
  const { data: channels, error: channelsError } = await supabase
    .schema("sales_channels")
    .from("channels")
    .select("id, key")
    .in("key", parsed.data.channelKeys);

  if (channelsError || !channels) {
    return { ok: false, error: "Unable to load sales channels." };
  }

  if (channels.length === 0) {
    return { ok: false, error: "No valid channels found." };
  }

  const channelIds = channels.map((channel) => channel.id);

  // Validate installed channels for this organization.
  const { data: installations, error: installationError } = await supabase
    .schema("sales_channels")
    .from("channel_installations")
    .select("channel_id, status")
    .eq("organization_id", organizationId)
    .in("channel_id", channelIds)
    .in("status", ["active", "paused"]);
  if (installationError) return { ok: false, error: "Unable to validate installed channels." };

  const installedIds = new Set((installations ?? []).map((installation) => installation.channel_id));
  const requestedIds = new Set(channels.filter((channel) => installedIds.has(channel.id)).map((channel) => channel.id));

  if (requestedIds.size === 0) {
    return { ok: false, error: "No installed channels selected for publishing." };
  }

  const now = new Date().toISOString();

  const rows = Array.from(requestedIds).map((channelId) => ({
    organization_id: organizationId,
    store_id: null,
    installation_id: null,
    product_id: parsed.data.productId,
    external_product_id: null,
    external_product_url: null,
    publication_status: "published",
    channel_specific_data: {},
    channel_id: channelId,
    last_published_at: now,
    last_synced_at: null,
    last_error_code: null,
  }));
  if (rows.length > 0) {
    const { error } = await supabase
      .schema("sales_channels")
      .from("product_listings")
      .upsert(rows, { onConflict: "installation_id,external_product_id" });
    if (error) return { ok: false, error: "Unable to publish the product to the selected channels." };
  }

  revalidatePath(`/products/${parsed.data.productId}`);
  revalidatePath("/products");
  return { ok: true };
}
