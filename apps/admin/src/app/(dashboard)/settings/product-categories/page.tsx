import { redirect } from "next/navigation";
import { requireOrganization, NO_ACTIVE_MEMBERSHIP_ERROR } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchTaxonomyManifest } from "@/lib/taxonomy";
import { ProductCategoryGroupsForm } from "./product-category-groups-form";


export default async function ProductCategorySettingsPage() {
  let context;
  try {
    context = await requireOrganization();
  } catch (error) {
    if (error instanceof Error && error.message === NO_ACTIVE_MEMBERSHIP_ERROR) redirect("/onboarding");
    throw error;
  }

  const organizationId = context.activeOrganization?.id;
  if (!organizationId) redirect("/onboarding");
  if (!context.permissions.has("settings.view")) redirect("/overview");

  const supabase = await createServerSupabaseClient();

  const [manifest, { data: enabled, error: enabledError }] = await Promise.all([
    fetchTaxonomyManifest(),
    supabase.from("taxonomy")
      .select("category_id")
      .eq("organization_id", organizationId)
      .eq("version", "2026-11")
      .eq("enabled", true)
      .order("position", { ascending: true }),
  ]);

  if (enabledError) {
    console.error("Product category settings load failed.", {
      enabledCode: enabledError.code,
    });
    throw new Error("Unable to load product category settings.");
  }

  const roots = manifest.roots.map((root) => ({
    id: `gid://shopify/TaxonomyCategory/${root.prefix}`,
    name: root.name,
    vertical_prefix: root.prefix,
  }));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-8 sm:px-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Product categories</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the Taxonomy groups available to products in this organization.
        </p>
      </div>
      <ProductCategoryGroupsForm
        roots={roots}
        enabledIds={(enabled ?? []).map((row) => row.category_id)}
        canManage={context.permissions.has("settings.manage")}
      />
    </main>
  );
}

