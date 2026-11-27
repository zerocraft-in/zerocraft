"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchTaxonomyManifest } from "@/lib/taxonomy";

const TAXONOMY_VERSION = "2026-11";
const inputSchema = z.array(z.string().regex(/^gid:\/\/shopify\/TaxonomyCategory\/.+$/)).max(26);

export type SaveTaxonomyRootsResult = { ok: true } | { ok: false; error: string };

export async function saveOrganizationTaxonomyRoots(input: unknown): Promise<SaveTaxonomyRootsResult> {
  const context = await requirePermission("settings.manage");
  const organization = context.activeOrganization;
  if (!organization) return { ok: false, error: "No active organization." };

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success || new Set(parsed.data ?? []).size !== (parsed.data ?? []).length) {
    return { ok: false, error: "Choose valid, unique category groups." };
  }

  try {
    const manifest = await fetchTaxonomyManifest();
    const allowedRootIds = new Set(manifest.roots.map((root) => `gid://shopify/TaxonomyCategory/${root.prefix}`));
    if (parsed.data.some((id) => !allowedRootIds.has(id))) {
      return { ok: false, error: "Choose valid category groups." };
    }
  } catch {
    return { ok: false, error: "Product categories are temporarily unavailable." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("taxonomy", {
    p_organization_id: organization.id,
    p_version: TAXONOMY_VERSION,
    p_category_ids: parsed.data,
  });

  if (error) {
    console.error("Taxonomy root settings save failed.", { code: error.code, message: error.message });
    return { ok: false, error: "Unable to save product category settings. Please try again." };
  }

  revalidatePath("/settings/product-categories");
  revalidatePath("/products/new");
  revalidatePath("/products");
  return { ok: true };
}
