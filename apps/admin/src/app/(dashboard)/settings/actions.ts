"use server";

import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/session";

export type UpdateOrganizationResult =
  | { ok: true }
  | { ok: false; error: string };

const updateOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Organization name must be at least 2 characters")
    .max(120, "Organization name must be at most 120 characters"),
  timezone: z.string().trim().min(1, "Timezone is required"),
  gstin: z
    .string()
    .trim()
    .max(15, "GSTIN is too long")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(20, "Phone is too long")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Enter a valid email address")
    .max(254, "Email is too long")
    .optional()
    .or(z.literal("")),
  invoice_prefix: z
    .string()
    .trim()
    .min(1, "Invoice prefix is required")
    .max(20, "Invoice prefix is too long"),
  tax_inclusive_pricing: z.boolean(),
});

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format();
    return true;
  } catch {
    return false;
  }
}

function isValidGSTIN(gstin: string): boolean {
  const gstinPattern =
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
  return gstinPattern.test(gstin);
}

function isValidInvoicePrefix(prefix: string): boolean {
  return /^[A-Za-z0-9-]+$/.test(prefix);
}

export async function updateOrganization(
  input: unknown,
): Promise<UpdateOrganizationResult> {
  // 1. Require authenticated caller with settings.manage permission.
  const context = await requirePermission("settings.manage");

  // 2. Resolve organization exclusively from the verified session.
  const organization = context.activeOrganization;
  if (!organization) {
    return { ok: false, error: "No active organization." };
  }
  const organizationId = organization.id;

  // 3. Validate input.
  const parseResult = updateOrganizationSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      ok: false,
      error:
        parseResult.error.issues[0]?.message ?? "Invalid organization data.",
    };
  }

  const {
    name,
    timezone,
    gstin,
    phone,
    email,
    invoice_prefix,
    tax_inclusive_pricing,
  } = parseResult.data;

  // Additional validation checks
  if (!isValidTimezone(timezone)) {
    return { ok: false, error: "Invalid timezone." };
  }

  if (gstin && !isValidGSTIN(gstin)) {
    return { ok: false, error: "Invalid GSTIN format." };
  }

  if (!isValidInvoicePrefix(invoice_prefix)) {
    return {
      ok: false,
      error: "Invoice prefix can only contain letters, numbers, and hyphens.",
    };
  }

  // 4. Call the authenticated Supabase client.
  const supabase = await createServerSupabaseClient();

  // 5. Update only the allowed columns.
  const { data, error } = await supabase
    .from("organizations")
    .update({
      name,
      timezone,
      gstin: gstin || null,
      phone: phone || null,
      email: email || null,
      invoice_prefix,
      tax_inclusive_pricing,
    })
    .eq("id", organizationId)
    .select("id")
    .maybeSingle();

  if (error) {
    // Only the error code and message are logged — never tokens or keys.
    console.error("Organization update failed.", {
      code: error.code,
      message: error.message,
    });

    if (error.code === "42501") {
      return {
        ok: false,
        error:
          "Your account is not allowed to update organization settings. Contact your administrator.",
      };
    }

    return {
      ok: false,
      error: "Unable to save organization settings. Please try again.",
    };
  }

  if (!data) {
    // The row was not written: row level security filtered it out.
    console.error("Organization update wrote no row.", { organizationId });
    return {
      ok: false,
      error: "Unable to save organization settings. Please try again.",
    };
  }

  // Re-render /settings so the page immediately shows the saved values.
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/settings");

  return { ok: true };
}

export type UpdateBusinessDetailsResult =
  | { ok: true }
  | { ok: false; error: string };

const updateBusinessDetailsSchema = z.object({
  organizationId: z.string().min(1, "Organization is required"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(254)
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(30, "Phone is too long")
    .optional()
    .or(z.literal("")),
  address: z
    .object({
      street: z.string().trim().min(1, "Street is required"),
      apartment: z.string().trim().max(100).optional().or(z.literal("")),
      city: z.string().trim().min(1, "City is required").max(100),
      state: z.string().trim().min(1, "State is required").max(100),
      zip: z.string().trim().min(1, "PIN code is required").max(20),
    })
    .strip(),
  businessType: z.string().trim().min(1, "Business type is required"),
  nationality: z.string().trim().min(1, "Nationality is required"),
  dateOfBirth: z.string().datetime({ offset: true }),
  legalBusinessName: z.string().trim().max(120).optional().or(z.literal("")),
  businessAddress: z.string().trim().max(200).optional().or(z.literal("")),
  businessApartment: z.string().trim().max(100).optional().or(z.literal("")),
  businessCity: z.string().trim().max(100).optional().or(z.literal("")),
  businessState: z.string().trim().max(100).optional().or(z.literal("")),
  businessPinCode: z.string().trim().max(20).optional().or(z.literal("")),
  businessPhoneCountry: z.string().trim().max(4).optional().or(z.literal("")),
  businessPhone: z.string().trim().max(30).optional().or(z.literal("")),
});

export async function updateBusinessDetails(
  input: unknown,
): Promise<UpdateBusinessDetailsResult> {
  // 1. Require authenticated caller with settings.manage permission.
  const context = await requirePermission("settings.manage");

  // 2. Resolve organization exclusively from the verified session.
  const organization = context.activeOrganization;
  if (!organization) {
    return { ok: false, error: "No active organization." };
  }

  // 3. Validate input.
  const parseResult = updateBusinessDetailsSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      ok: false,
      error:
        parseResult.error.issues[0]?.message ?? "Invalid business details.",
    };
  }

  const {
    name,
    email,
    phone,
    address,
    businessType,
    nationality,
    dateOfBirth,
    legalBusinessName,
    businessAddress,
    businessApartment,
    businessCity,
    businessState,
    businessPinCode,
    businessPhoneCountry,
    businessPhone,
  } = parseResult.data;

  // 4. Call the authenticated Supabase client.
  const supabase = await createServerSupabaseClient();

  // Keep the business profile in the existing organization address JSON until
  // dedicated business-profile columns are introduced. Read/merge first so
  // store-address edits never erase the business profile.
  const { data: existing, error: existingError } = await supabase
    .from("organizations")
    .select("address")
    .eq("id", organization.id)
    .maybeSingle();

  if (existingError) {
    return {
      ok: false,
      error: "Unable to load current business details. Please try again.",
    };
  }

  const currentAddress = (existing?.address ?? {}) as Record<string, unknown>;

  const { data, error } = await supabase
    .from("organizations")
    .update({
      name,
      email: email || null,
      phone: phone || null,
      address: {
        ...currentAddress,
        ...address,
        businessType,
        nationality,
        dateOfBirth,
        legalBusinessName: legalBusinessName || "",
        businessAddress: businessAddress || "",
        businessApartment: businessApartment || "",
        businessCity: businessCity || "",
        businessState: businessState || "",
        businessPinCode: businessPinCode || "",
        businessPhoneCountry: businessPhoneCountry || "IN",
        businessPhone: businessPhone || "",
      } as Record<string, unknown>,
    })
    .eq("id", organization.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Business details update failed.", {
      code: error.code,
      message: error.message,
    });

    if (error.code === "42501") {
      return {
        ok: false,
        error:
          "Your account is not allowed to update business details. Contact your administrator.",
      };
    }

    return {
      ok: false,
      error: "Unable to save business details. Please try again.",
    };
  }

  if (!data) {
    console.error("Business details update wrote no row.", {
      organizationId: organization.id,
    });
    return {
      ok: false,
      error: "Unable to save business details. Please try again.",
    };
  }

  // Re-render /settings so the page immediately shows the saved values.
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/settings");

  return { ok: true };
}

const storeContactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email().max(254),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export async function updateStoreContact(
  input: unknown,
): Promise<UpdateOrganizationResult> {
  const context = await requirePermission("settings.manage");
  const parsed = storeContactSchema.safeParse(input);
  if (!parsed.success || !context.activeOrganization)
    return {
      ok: false,
      error: parsed.success
        ? "No active organization."
        : (parsed.error.issues[0]?.message ?? "Invalid store contact details."),
    };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("organizations")
    .update(parsed.data)
    .eq("id", context.activeOrganization.id)
    .select("id")
    .maybeSingle();
  if (error || !data)
    return {
      ok: false,
      error: "Unable to save store contact details. Please try again.",
    };
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/settings");
  return { ok: true };
}

const storeAddressSchema = z.object({
  street: z.string().trim().min(1, "Address is required").max(200),
  apartment: z.string().trim().max(100).optional().or(z.literal("")),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().min(1, "State is required").max(100),
  zip: z.string().trim().min(1, "PIN code is required").max(20),
  country: z.string().trim().min(1).max(80),
});

export async function updateStoreAddress(
  input: unknown,
): Promise<UpdateOrganizationResult> {
  const context = await requirePermission("settings.manage");
  const parsed = storeAddressSchema.safeParse(input);
  if (!parsed.success || !context.activeOrganization)
    return {
      ok: false,
      error: parsed.success
        ? "No active organization."
        : (parsed.error.issues[0]?.message ?? "Invalid store address."),
    };
  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase
    .from("organizations")
    .select("address")
    .eq("id", context.activeOrganization.id)
    .maybeSingle();
  const currentAddress = (existing?.address ?? {}) as Record<string, unknown>;
  const { data, error } = await supabase
    .from("organizations")
    .update({
      address: { ...currentAddress, ...parsed.data },
      country: parsed.data.country,
    })
    .eq("id", context.activeOrganization.id)
    .select("id")
    .maybeSingle();
  if (error || !data)
    return {
      ok: false,
      error: "Unable to save store address. Please try again.",
    };
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/settings");
  return { ok: true };
}

export async function updateStoreCurrency(
  currency: string,
): Promise<UpdateOrganizationResult> {
  const context = await requirePermission("settings.manage");
  if (!context.activeOrganization || !currency.trim())
    return { ok: false, error: "Select a currency." };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({ currency })
    .eq("id", context.activeOrganization.id)
    .select("id")
    .maybeSingle();
  if (error || !data)
    return {
      ok: false,
      error: "Unable to save store currency. Please try again.",
    };
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/settings");
  return { ok: true };
}
