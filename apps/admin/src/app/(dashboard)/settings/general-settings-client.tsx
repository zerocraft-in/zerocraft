"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "@zerocraft/ui/toast";
import { Badge } from "@zerocraft/ui/badge";
import { Button } from "@zerocraft/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@zerocraft/ui/card";
import { Separator } from "@zerocraft/ui/separator";

import { SettingsRow } from "./settings-row";
import { BusinessDetailsRow } from "./business-details-row";
import { EditStoreAddressDialog } from "./edit-store-address-dialog";
import { ChangeCurrencyDialog } from "./change-currency-dialog";
import { useSettingsDirtyForm } from "@/components/providers/dirty-provider";
import { updateOrganization } from "./actions";

type Org = {
  id: string;
  name: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  address: Record<string, unknown> | null;
  timezone: string | null;
  invoice_prefix: string | null;
  gstin: string | null;
  tax_inclusive_pricing: boolean | null;
  currency: string | null;
};

export function GeneralSettingsClient({
  org,
  addressLines,
}: {
  org: Org;
  addressLines: string[];
}) {
  const [prefix, setPrefix] = React.useState(org.invoice_prefix || "#");
  const [suffix, setSuffix] = React.useState("");
  const [timezone, setTimezone] = React.useState(
    org.timezone || "Asia/Kolkata",
  );
  const [fulfillment, setFulfillment] = React.useState("none");
  const [archive, setArchive] = React.useState(true);
  const [backupRegion, setBackupRegion] = React.useState("India");
  const [unitSystem, setUnitSystem] = React.useState("Metric system");
  const [weightUnit, setWeightUnit] = React.useState("Kilogram (kg)");
  const [currency, setCurrency] = React.useState(org.currency || "INR");
  const [addressOpen, setAddressOpen] = React.useState(false);
  const [currencyOpen, setCurrencyOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const initial = React.useMemo(
    () => ({
      prefix: org.invoice_prefix || "#",
      suffix: "",
      timezone: org.timezone || "Asia/Kolkata",
      backupRegion: "India",
      unitSystem: "Metric system",
      weightUnit: "Kilogram (kg)",
      fulfillment: "none",
      archive: true,
      currency: org.currency || "INR",
    }),
    [org],
  );
  const [saved, setSaved] = React.useState(initial);
  const dirty =
    prefix !== saved.prefix ||
    suffix !== saved.suffix ||
    timezone !== saved.timezone ||
    backupRegion !== saved.backupRegion ||
    unitSystem !== saved.unitSystem ||
    weightUnit !== saved.weightUnit ||
    fulfillment !== saved.fulfillment ||
    archive !== saved.archive ||
    currency !== saved.currency;

  async function saveOrganization(
    next: { invoice_prefix?: string; timezone?: string } = {},
  ) {
    setSaving(true);
    const result = await updateOrganization({
      name: org.name || "Maara",
      timezone: next.timezone ?? timezone,
      gstin: org.gstin || "",
      phone: org.phone || "",
      email: org.email || "",
      invoice_prefix: next.invoice_prefix ?? prefix,
      tax_inclusive_pricing: Boolean(org.tax_inclusive_pricing),
    });
    setSaving(false);
    if (result.ok) {
      setSaved({
        prefix,
        suffix,
        timezone: next.timezone ?? timezone,
        backupRegion,
        unitSystem,
        weightUnit,
        fulfillment,
        archive,
        currency,
      });
      toast.add({ title: "Settings saved", type: "success" });
    } else toast.add({ title: result.error, type: "error" });
  }

  function discardChanges() {
    setPrefix(saved.prefix);
    setSuffix(saved.suffix);
    setTimezone(saved.timezone);
    setBackupRegion(saved.backupRegion);
    setUnitSystem(saved.unitSystem);
    setWeightUnit(saved.weightUnit);
    setFulfillment(saved.fulfillment);
    setArchive(saved.archive);
    setCurrency(saved.currency);
  }

  const address = org.address as {
    companyName?: string;
    country?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;

  useSettingsDirtyForm({
    dirty,
    saving,
    onDiscard: discardChanges,
    onSave: () => void saveOrganization(),
  });

  return (
    <div className="relative space-y-4">
      <div className="mx-auto flex w-full max-w-3xl flex-col px-5 py-16 space-y-4">
        <div className="space-y-10">
          <h2 className="text-2xl font-semibold">General</h2>

          <CardHeader>
            <CardTitle>Business details</CardTitle>
            <CardDescription>
              Business entity used for financial products, markets, apps, and
              taxes in this shop
            </CardDescription>
          </CardHeader>
        </div>
        <BusinessDetailsRow org={org} />

        <Card className="mb-6 overflow-hidden">
          <CardHeader>
            <CardTitle>Store contact details</CardTitle>
          </CardHeader>
          <CardContent>
            <SettingsRow
              icon="Mail"
              label={org.name || "Maara"}
              description={`${org.email || "No email"} · ${org.phone || "No phone number"}`}
              href="/settings/store-contact-details"
            />
            <SettingsRow
              icon="MapPin"
              label="Store address"
              description={
                addressLines.length
                  ? addressLines.join(", ")
                  : address?.country || org.country || "India"
              }
              onClick={() => setAddressOpen(true)}
            />
          </CardContent>
        </Card>

        <section className="mb-6">
          <div className="mb-3">
            <h2 className="text-base font-semibold">Store defaults</h2>
          </div>
          <Card className="overflow-hidden">
            <CardContent className="divide-y p-0">
              <button
                type="button"
                onClick={() => setCurrencyOpen(true)}
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left hover:bg-muted/40"
              >
                <div>
                  <p className="font-medium">Currency display</p>
                  <p className="text-sm text-muted-foreground">
                    To manage the currencies customers see, go to{" "}
                    <Link
                      onClick={(event) => event.stopPropagation()}
                      className="text-primary underline underline-offset-2"
                      href="/settings/markets"
                    >
                      Markets
                    </Link>
                  </p>
                </div>
                <Badge variant="outline">
                  {currency === "INR" ? "Indian Rupee (INR ₹)" : currency}
                </Badge>
              </button>
              <div className="px-4 py-4">
                <label className="text-sm font-medium">Backup Region</label>
                <select
                  value={backupRegion}
                  onChange={(e) => setBackupRegion(e.target.value)}
                  className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option>India</option>
                  <option>United States</option>
                  <option>United Kingdom</option>
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Determines settings for customers outside of your markets
                </p>
              </div>
              <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Unit system</label>
                  <select
                    value={unitSystem}
                    onChange={(e) => setUnitSystem(e.target.value)}
                    className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option>Metric system</option>
                    <option>Imperial system</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Default weight unit
                  </label>
                  <select
                    value={weightUnit}
                    onChange={(e) => setWeightUnit(e.target.value)}
                    className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option>Kilogram (kg)</option>
                    <option>Gram (g)</option>
                  </select>
                </div>
              </div>
              <div className="px-4 py-4">
                <label className="text-sm font-medium">Time zone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="Asia/Kolkata">
                    (GMT+05:30) Chennai, Kolkata, Mumbai, New Delhi
                  </option>
                  <option value="America/New_York">
                    (GMT-05:00) Eastern Time (US &amp; Canada)
                  </option>
                  <option value="UTC">(GMT+00:00) UTC</option>
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sets the time for when orders and analytics are recorded
                </p>
              </div>
            </CardContent>
          </Card>
          <p className="mt-3 text-sm text-muted-foreground">
            To change your user level time zone and language visit your{" "}
            <Link
              className="text-primary underline underline-offset-2"
              href="/settings/organization-details"
            >
              account settings
            </Link>
          </p>
        </section>

        <Card className="mb-6 overflow-hidden">
          <CardHeader>
            <CardTitle>Order ID format</CardTitle>
            <CardDescription>
              Shown on the order page, customer pages, and customer order
              notifications to identify order
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Prefix</label>
                <input
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Suffix</label>
                <input
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Your order ID will appear as {prefix}1001{suffix}, {prefix}1002
              {suffix}, {prefix}1003{suffix}, …
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6 overflow-hidden">
          <CardHeader>
            <CardTitle>Order processing</CardTitle>
            <CardDescription>
              Choose what happens after an order is paid or fulfilled
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm font-medium">
                After an order has been paid
              </p>
              <div className="mt-3 space-y-3">
                {[
                  ["all", "Automatically fulfill the order’s line items"],
                  [
                    "gift",
                    "Automatically fulfill only the gift cards of the order",
                  ],
                  [
                    "none",
                    "Don’t fulfill any of the order’s line items automatically",
                  ],
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-3 text-sm"
                  >
                    <input
                      type="radio"
                      name="fulfillment"
                      value={value}
                      checked={fulfillment === value}
                      onChange={() => setFulfillment(value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">
                After an order has been fulfilled and paid, or when all items
                have been refunded
              </p>
              <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={archive}
                  onChange={(e) => setArchive(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Automatically archive the order{" "}
                  <span className="block text-xs text-muted-foreground">
                    The order will be removed from your list of open orders.
                  </span>
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        <section className="mb-6">
          <h2 className="mb-3 text-base font-semibold">Store assets</h2>
          <Card className="overflow-hidden">
            <CardContent>
              <SettingsRow
                icon="Folder"
                label="Metafields"
                description="Available in themes and configurable for Storefront API"
                href="/settings/metafields-and-metaobjects"
              />
              <SettingsRow
                icon="Sparkles"
                label="Brand"
                description="Integrate brand assets across sales channels, themes and apps"
                href="/settings/branding"
              />
            </CardContent>
          </Card>
        </section>
        <section className="mb-6">
          <h2 className="mb-3 text-base font-semibold">Resources</h2>
          <Card className="overflow-hidden">
            <CardContent>
              <SettingsRow
                icon="BookOpen"
                label="Change log"
                href="/audit-logs"
              />
              <SettingsRow
                icon="Headphones"
                label="Help Center"
                href="https://help.maara.co.in"
              />
              <SettingsRow
                icon="Code"
                label="Hire a Partner"
                href="https://www.maara.co.in/partners/directory"
              />
              <Separator className="my-3" />
              <SettingsRow
                icon="Activity"
                label="Keyboard shortcuts"
                onClick={() =>
                  toast.add({
                    title: "Keyboard shortcuts are coming soon",
                    type: "info",
                  })
                }
              />
              <SettingsRow
                icon="Activity"
                label="Store activity log"
                href="/audit-logs"
              />
            </CardContent>
          </Card>
        </section>
        <Card className="mb-8 overflow-hidden">
          <CardHeader>
            <CardTitle>Transfer store</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Move this store into an organization or transfer to an external
                owner.
              </p>
              <Link
                className="text-sm text-primary underline underline-offset-2"
                href="https://help.maara.co.in/en/manual/organization-settings/create-an-organization"
              >
                Learn more
              </Link>
            </div>
            <Button
              size="sm"
              onClick={() =>
                toast.add({
                  title: "Transfer workflow is not available yet",
                  type: "info",
                })
              }
            >
              Manage
            </Button>
          </CardContent>
        </Card>
        <EditStoreAddressDialog
          key={`${addressOpen}-${JSON.stringify(address)}-${org.country}`}
          open={addressOpen}
          onOpenChange={setAddressOpen}
          address={address}
          country={org.country}
        />
        <ChangeCurrencyDialog
          key={`${currencyOpen}-${currency}`}
          open={currencyOpen}
          onOpenChange={setCurrencyOpen}
          onSaved={(next) => {
            setCurrency(next);
            setSaved((current) => ({ ...current, currency: next }));
          }}
          value={currency}
        />
      </div>
    </div>
  );
}
