"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { updateOrganization } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@zerocraft/ui/card";
import { useSettingsDirtyForm } from "@/components/providers/dirty-provider";

// Mirrors the server-side checks in ./actions.ts.
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
const INVOICE_PREFIX_PATTERN = /^[A-Za-z0-9-]+$/;

const settingsSchema = z.object({
  name: z.string().trim().min(2, "Organization name must be at least 2 characters").max(120, "Organization name must be at most 120 characters"),
  timezone: z.string().trim().min(1, "Timezone is required"),
  gstin: z
    .string()
    .trim()
    .max(15, "GSTIN is too long")
    .refine((value) => value === "" || GSTIN_PATTERN.test(value), {
      message: "Enter a valid GSTIN",
    })
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().max(20, "Phone is too long").optional().or(z.literal("")),
  email: z.string().email("Enter a valid email address").max(254, "Email is too long").optional().or(z.literal("")),
  invoice_prefix: z
    .string()
    .trim()
    .min(1, "Invoice prefix is required")
    .max(20, "Invoice prefix is too long")
    .refine((value) => INVOICE_PREFIX_PATTERN.test(value), {
      message: "Invoice prefix can only contain letters, numbers, and hyphens",
    }),
  tax_inclusive_pricing: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

interface SettingsFormProps {
  org: {
    id: string
    name: string | null
    slug: string | null
    currency: string | null
    timezone: string | null
    country: string | null
    gstin: string | null
    phone: string | null
    email: string | null
    address: Record<string, unknown> | null
    logo_path: string | null
    invoice_prefix: string | null
    invoice_next_number: number | null
    tax_inclusive_pricing: boolean | null
    created_at: string | null
    updated_at: string | null
  }
  canManage: boolean
}

export default function SettingsForm({ org, canManage }: SettingsFormProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: org.name ?? "",
      timezone: org.timezone ?? "",
      gstin: org.gstin ?? "",
      phone: org.phone ?? "",
      email: org.email ?? "",
      invoice_prefix: org.invoice_prefix ?? "",
      tax_inclusive_pricing: org.tax_inclusive_pricing ?? false,
    },
  });

  async function handleSubmit(values: SettingsFormValues) {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await updateOrganization({
        name: values.name,
        timezone: values.timezone,
        gstin: values.gstin,
        phone: values.phone,
        email: values.email || "",
        invoice_prefix: values.invoice_prefix,
        tax_inclusive_pricing: values.tax_inclusive_pricing,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      form.reset(values);
      setSuccess("Organization settings saved.");
    } catch {
      setError("Unable to save organization settings. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useSettingsDirtyForm({
    dirty: form.formState.isDirty,
    saving: loading,
    onDiscard: () => {
      form.reset();
      setError(null);
      setSuccess(null);
    },
    onSave: () => void form.handleSubmit(handleSubmit)(),
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-10">
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>
              Basic organization details shown across the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="name" className="text-xs font-semibold text-body">
                  Organization Name
                </label>
                <input
                  id="name"
                  type="text"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                  {...form.register("name")}
                  disabled={!canManage || loading}
                />
                {form.formState.errors.name && (
                  <p className="text-2xs text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="timezone" className="text-xs font-semibold text-body">
                  Timezone
                </label>
                <input
                  id="timezone"
                  type="text"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                  {...form.register("timezone")}
                  disabled={!canManage || loading}
                />
                {form.formState.errors.timezone && (
                  <p className="text-2xs text-destructive">
                    {form.formState.errors.timezone.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="gstin" className="text-xs font-semibold text-body">
                  GSTIN
                </label>
                <input
                  id="gstin"
                  type="text"
                  placeholder="Enter GSTIN"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                  {...form.register("gstin")}
                  disabled={!canManage || loading}
                />
                {form.formState.errors.gstin && (
                  <p className="text-2xs text-destructive">
                    {form.formState.errors.gstin.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="phone" className="text-xs font-semibold text-body">
                  Phone
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                  {...form.register("phone")}
                  disabled={!canManage || loading}
                />
                {form.formState.errors.phone && (
                  <p className="text-2xs text-destructive">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-xs font-semibold text-body">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                  {...form.register("email")}
                  disabled={!canManage || loading}
                />
                {form.formState.errors.email && (
                  <p className="text-2xs text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Regional Settings</CardTitle>
            <CardDescription>
              Country, currency, and timezone settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="country" className="text-xs font-semibold text-body">
                  Country
                </label>
                <input
                  id="country"
                  type="text"
                  readOnly
                  disabled
                  className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
                  value={org.country ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="currency" className="text-xs font-semibold text-body">
                  Currency
                </label>
                <input
                  id="currency"
                  type="text"
                  readOnly
                  disabled
                  className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
                  value={org.currency ?? ""}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Invoice Settings</CardTitle>
            <CardDescription>
              Invoice prefix, tax settings, and next invoice number.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="invoice_prefix" className="text-xs font-semibold text-body">
                  Invoice Prefix
                </label>
                <input
                  id="invoice_prefix"
                  type="text"
                  placeholder="INV"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                  {...form.register("invoice_prefix")}
                  disabled={!canManage || loading}
                />
                {form.formState.errors.invoice_prefix && (
                  <p className="text-2xs text-destructive">
                    {form.formState.errors.invoice_prefix.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="tax_inclusive_pricing" className="text-xs font-semibold text-body">
                  Tax-Inclusive Pricing
                </label>
                <input
                  id="tax_inclusive_pricing"
                  type="checkbox"
                  className="rounded border-input bg-background checked:bg-brand text-brand checked:border-brand"
                  {...form.register("tax_inclusive_pricing")}
                  disabled={!canManage || loading}
                />
                <p className="text-2xs text-muted-foreground">
                  Tax is included in invoice line item prices.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="invoice_next_number" className="text-xs font-semibold text-body">
                  Invoice Next Number
                </label>
                <input
                  id="invoice_next_number"
                  type="text"
                  readOnly
                  disabled
                  className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
                  value={org.invoice_next_number ?? ""}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {error}
            </div>
          )}
          {success && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-md border border-success bg-success/10 px-3 py-2 text-xs text-success"
            >
              {success}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
