import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  requireOrganization,
  NO_ACTIVE_MEMBERSHIP_ERROR,
} from "@/lib/auth/session";
import { GeneralSettingsClient } from "./general-settings-client";

type OrganizationRow = {
  id: string;
  name: string | null;
  slug: string | null;
  currency: string | null;
  timezone: string | null;
  country: string | null;
  gstin: string | null;
  phone: string | null;
  email: string | null;
  address: Record<string, unknown> | null;
  logo_path: string | null;
  invoice_prefix: string | null;
  invoice_next_number: number | null;
  tax_inclusive_pricing: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

async function getOrganization(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("organizations")
    .select(
      "id,name,slug,currency,timezone,country,gstin,phone,email,address,logo_path,invoice_prefix,invoice_next_number,tax_inclusive_pricing,created_at,updated_at",
    )
    .eq("id", organizationId)
    .maybeSingle();
  if (error) throw new Error("Unable to load organization details");
  return (data ?? null) as OrganizationRow | null;
}

async function requireOrganizationOrRedirect() {
  try {
    return await requireOrganization();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === NO_ACTIVE_MEMBERSHIP_ERROR
    ) {
      redirect("/onboarding");
    }
    throw error;
  }
}

export default async function SettingsPage() {
  const context = await requireOrganizationOrRedirect();

  const organizationId = context.activeOrganization?.id;
  if (!organizationId) {
    redirect("/onboarding");
  }

  if (!context.permissions.has("settings.view")) {
    redirect("/overview");
  }

  const org = await getOrganization(
    await createServerSupabaseClient(),
    organizationId,
  );
  if (!org) redirect("/overview");

  const address = org.address as {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;
  const addressLines = [
    address?.street,
    address?.city,
    address?.state,
    address?.zip,
  ].filter(Boolean) as string[];

  return <GeneralSettingsClient org={org} addressLines={addressLines} />;
}
