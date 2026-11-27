"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePermission } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SalesChannelActionResult =
  | { ok: true }
  | { ok: false; error: string };

const installationSchema = z.object({
  channelKey: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
  status: z.enum(["active", "paused", "disconnected"]),
});

export async function setChannelInstallation(
  input: unknown,
): Promise<SalesChannelActionResult> {
  const context = await requirePermission("sales_channels.manage");
  const parsed = installationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid channel installation." };

  if (!context.activeOrganization) {
    return { ok: false, error: "No active organization." };
  }

  const supabase = await createServerSupabaseClient();

  const { data: channel, error: channelError } = await supabase
    .schema("sales_channels")
    .from("channels")
    .select("id")
    .eq("key", parsed.data.channelKey)
    .maybeSingle();

  if (channelError || !channel) {
    return { ok: false, error: "Sales channel was not found." };
  }

  // Resolve the store for this organization. Use the first active store.
  const { data: store, error: storeError } = await supabase
    .from("public.stores")
    .select("id")
    .eq("organization_id", context.activeOrganization.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (storeError || !store) {
    return { ok: false, error: "No active store found for this organization." };
  }

  // Check if an installation already exists for this store + channel.
  const { data: existing } = await supabase
    .schema("sales_channels")
    .from("channel_installations")
    .select("id")
    .eq("store_id", store.id)
    .eq("channel_id", channel.id)
    .maybeSingle();

  if (existing) {
    // Update existing installation.
    const { error } = await supabase
      .schema("sales_channels")
    .from("channel_installations")
      .update({
        status: parsed.data.status,
        connected_at: parsed.data.status === "active" ? new Date().toISOString() : null,
        disconnected_at: parsed.data.status === "disconnected" ? new Date().toISOString() : null,
      })
      .eq("id", existing.id);

    if (error) {
      return { ok: false, error: "Unable to update the sales channel." };
    }
  } else {
    // Insert new installation.
    const { error } = await supabase
      .schema("sales_channels")
    .from("channel_installations")
      .insert({
        organization_id: context.activeOrganization.id,
        store_id: store.id,
        channel_id: channel.id,
        status: parsed.data.status,
        installed_by: context.user.id,
        installed_at: parsed.data.status === "active" || parsed.data.status === "paused" ? new Date().toISOString() : null,
        connected_at: parsed.data.status === "active" ? new Date().toISOString() : null,
      });

    if (error) {
      return { ok: false, error: "Unable to install the sales channel." };
    }
  }

  revalidatePath("/settings/sales-channels");
  return { ok: true };
}
