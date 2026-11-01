"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  IconBuildingStore,
  IconChevronRight,
  IconClockHour4,
  IconDots,
  IconFileText,
  IconKeyboard,
  IconMapPin,
  IconPackage,
  IconPalette,
  IconQuestionMark,
  IconTransfer,
} from "@tabler/icons-react";
import { Input } from "@zerocraft/components/ui/input";
import { SelectField } from "@zerocraft/components/ui/select-field";

type StoreSettingsRecord = {
  id: string;
  name: string;
  slug: string;
  settings?: {
    country?: string;
    currency?: string;
    timezone?: string;
    contactEmail?: string;
    phone?: string;
    address?: string;
    industry?: string;
  };
};

const countryNames: Record<string, string> = {
  IN: "India",
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
};

function SettingsSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div>
        <h2 className="text-sm font-medium tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function SettingsRow({ icon: Icon, title, detail, trailing }: { icon: typeof IconBuildingStore; title: string; detail?: string; trailing?: ReactNode }) {
  return (
    <div className="flex min-h-[58px] items-center gap-3 px-4 py-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" stroke={1.7} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{title}</p>
        {detail && <p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p>}
      </div>
      {trailing}
    </div>
  );
}

const cardClass = "overflow-hidden rounded-2xl border bg-card shadow-sm";

export function GeneralStoreSettings() {
  const pathname = usePathname();
  const slug = pathname.match(/^\/store\/([^/]+)/)?.[1] || "";
  const [store, setStore] = useState<StoreSettingsRecord | null>(null);
  const [unitSystem, setUnitSystem] = useState("metric");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [backupRegion, setBackupRegion] = useState("IN");
  const [fulfillment, setFulfillment] = useState("manual");
  const [autoArchive, setAutoArchive] = useState(true);
  const [prefix, setPrefix] = useState("#");
  const [suffix, setSuffix] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/platform/stores", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!active || !Array.isArray(payload?.stores)) return;
        const current = payload.stores.find((item: StoreSettingsRecord) => item.slug === slug) as StoreSettingsRecord | undefined;
        if (!current) return;
        setStore(current);
        setBackupRegion(current.settings?.country || "IN");
        setTimezone(current.settings?.timezone || "Asia/Kolkata");
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [slug]);

  const regionName = useMemo(() => countryNames[store?.settings?.country || backupRegion] || store?.settings?.country || backupRegion, [backupRegion, store?.settings?.country]);
  const currency = (store?.settings?.currency || "INR").toUpperCase();
  const currencyLabel = currency === "INR" ? "Indian Rupee (INR ₹)" : `${currency} currency`;

  return (
    <main className="mx-auto w-full max-w-[800px] space-y-7 pb-20">
      <h1 className="text-2xl font-medium tracking-tight">General</h1>

      <SettingsSection title="Business details" description="Business entity used for financial products, markets, apps, and taxes in this store.">
        <div className={`${cardClass} flex min-h-[72px] items-center gap-3 px-4 py-3.5`}>
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-700"><IconBuildingStore className="size-4" /></span>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{store?.name || "Loading store…"}</p><p className="mt-0.5 text-xs text-muted-foreground">{regionName}</p></div>
          <IconDots className="size-4 shrink-0 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground">Store profile and legal details are managed with your store account.</p>
      </SettingsSection>

      <SettingsSection title="Store contact details">
        <div className={cardClass}>
          <SettingsRow icon={IconBuildingStore} title={store?.name || "Store contact"} detail={[store?.settings?.contactEmail, store?.settings?.phone || "No phone number"].filter(Boolean).join(" · ")} trailing={<IconChevronRight className="size-4 shrink-0 text-muted-foreground" />} />
          <div className="border-t bg-muted/30"><SettingsRow icon={IconMapPin} title="Store address" detail={[store?.settings?.address, regionName].filter(Boolean).join(" · ") || "Add a store address in your business profile"} trailing={<IconChevronRight className="size-4 shrink-0 text-muted-foreground" />} /></div>
        </div>
      </SettingsSection>

      <SettingsSection title="Store defaults">
        <div className={`${cardClass} p-4 sm:p-5`}>
          <div className="flex min-h-12 items-center gap-3">
            <div className="min-w-0 flex-1"><p className="text-xs font-medium">Currency display</p><p className="mt-1 text-xs text-muted-foreground">Product prices and orders use the store currency.</p></div>
            <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[11px]">{currencyLabel}</span>
            <IconDots className="size-4 shrink-0 text-muted-foreground" />
          </div>
          <div className="mt-4 grid gap-x-4 gap-y-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-medium sm:col-span-2">Backup region<SelectField value={backupRegion} onValueChange={setBackupRegion} options={[{ value: "IN", label: "India" }, { value: "US", label: "United States" }, { value: "GB", label: "United Kingdom" }, { value: "CA", label: "Canada" }, { value: "AU", label: "Australia" }]} /><span className="font-normal text-muted-foreground">Determines default settings for customers outside your markets.</span></label>
            <label className="grid gap-1.5 text-xs font-medium">Unit system<SelectField value={unitSystem} onValueChange={setUnitSystem} options={[{ value: "metric", label: "Metric system" }, { value: "imperial", label: "Imperial system" }]} /></label>
            <label className="grid gap-1.5 text-xs font-medium">Default weight unit<SelectField value={weightUnit} onValueChange={setWeightUnit} options={[{ value: "kg", label: "Kilogram (kg)" }, { value: "g", label: "Gram (g)" }, { value: "lb", label: "Pound (lb)" }, { value: "oz", label: "Ounce (oz)" }]} /></label>
            <label className="grid gap-1.5 text-xs font-medium sm:col-span-2">Time zone<SelectField value={timezone} onValueChange={setTimezone} options={[{ value: "Asia/Kolkata", label: "(GMT+05:30) India Standard Time" }, { value: "UTC", label: "(GMT+00:00) Coordinated Universal Time" }, { value: "America/New_York", label: "Eastern Time (US & Canada)" }, { value: "Europe/London", label: "London" }, { value: "Australia/Sydney", label: "Sydney" }]} /><span className="font-normal text-muted-foreground">Sets the time used for orders and analytics.</span></label>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Currency is set to {currencyLabel} for this store.</p>
      </SettingsSection>

      <SettingsSection title="Order ID format" description="Shown on order pages and customer order notifications to identify each order.">
        <div className={`${cardClass} p-4 sm:p-5`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-medium">Prefix<Input value={prefix} maxLength={12} onChange={(event) => setPrefix(event.target.value)} /></label>
            <label className="grid gap-1.5 text-xs font-medium">Suffix<Input value={suffix} maxLength={12} onChange={(event) => setSuffix(event.target.value)} /></label>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Your order ID will appear as {prefix || ""}1001{suffix || ""}, {prefix || ""}1002{suffix || ""}, …</p>
        </div>
      </SettingsSection>

      <SettingsSection title="Order processing">
        <div className={`${cardClass} space-y-5 p-4 sm:p-5`}>
          <fieldset className="space-y-2.5">
            <legend className="mb-2 text-xs font-medium">After an order has been paid</legend>
            {[["fulfill", "Automatically fulfill the order’s line items"], ["gift-cards", "Automatically fulfill only the gift cards in the order"], ["manual", "Don’t fulfill any of the order’s line items automatically"]].map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-start gap-2.5 text-xs"><input type="radio" name="fulfillment" value={value} checked={fulfillment === value} onChange={() => setFulfillment(value)} className="mt-0.5 accent-foreground" /><span>{label}</span></label>
            ))}
          </fieldset>
          <fieldset className="space-y-2.5 border-t pt-4">
            <legend className="mb-1 text-xs font-medium">After an order has been fulfilled and paid, or when all items have been refunded</legend>
            <label className="flex cursor-pointer items-start gap-2.5 text-xs"><input type="checkbox" checked={autoArchive} onChange={(event) => setAutoArchive(event.target.checked)} className="mt-0.5 accent-foreground" /><span><span className="block font-medium">Automatically archive the order</span><span className="mt-1 block text-muted-foreground">The order will be removed from your list of open orders.</span></span></label>
          </fieldset>
        </div>
      </SettingsSection>

      <SettingsSection title="Store assets">
        <div className={cardClass}>
          <Link href={`/store/${slug}/content/metaobjects`} className="block transition hover:bg-muted/30"><SettingsRow icon={IconPackage} title="Metafields and metaobjects" detail="Custom data available to store content and integrations." trailing={<IconChevronRight className="size-4 shrink-0 text-muted-foreground" />} /></Link>
          <div className="border-t"><SettingsRow icon={IconPalette} title="Brand" detail="Brand assets for consistent store presentation." trailing={<span className="rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">Coming soon</span>} /></div>
        </div>
      </SettingsSection>

      <SettingsSection title="Resources">
        <div className={cardClass}>
          <a href="mailto:hello@zerocraft.in?subject=Store%20change%20history" className="block transition hover:bg-muted/30"><SettingsRow icon={IconClockHour4} title="Change log" detail="Ask support about recent store changes." trailing={<IconChevronRight className="size-4 shrink-0 text-muted-foreground" />} /></a>
          <a href="mailto:hello@zerocraft.in?subject=Zerocraft%20store%20support" className="block border-t transition hover:bg-muted/30"><SettingsRow icon={IconQuestionMark} title="Zerocraft Help Center" detail="Get help with your store settings." trailing={<IconChevronRight className="size-4 shrink-0 text-muted-foreground" />} /></a>
          <a href="mailto:hello@zerocraft.in?subject=Zerocraft%20store%20support" className="block border-t transition hover:bg-muted/30"><SettingsRow icon={IconFileText} title="Contact a store specialist" detail="Get help setting up your store." trailing={<IconChevronRight className="size-4 shrink-0 text-muted-foreground" />} /></a>
          <div className="border-t"><SettingsRow icon={IconKeyboard} title="Keyboard shortcuts" detail="Use Ctrl + K to search workspace pages." trailing={<IconChevronRight className="size-4 shrink-0 text-muted-foreground" />} /></div>
          <a href="mailto:hello@zerocraft.in?subject=Store%20activity%20log" className="block border-t transition hover:bg-muted/30"><SettingsRow icon={IconClockHour4} title="Store activity log" detail="Request a record of recent store activity." trailing={<IconChevronRight className="size-4 shrink-0 text-muted-foreground" />} /></a>
        </div>
      </SettingsSection>

      <SettingsSection title="Transfer store">
        <div className={`${cardClass} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5`}>
          <div className="flex items-start gap-3"><IconTransfer className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><p className="text-xs leading-5 text-muted-foreground">Move this store into an organization or transfer it to another owner. Contact support to review transfer options.</p></div>
          <a href="mailto:hello@zerocraft.in?subject=Store%20transfer" className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-muted px-3 text-xs font-medium transition hover:bg-muted/70">Contact support</a>
        </div>
      </SettingsSection>
    </main>
  );
}
