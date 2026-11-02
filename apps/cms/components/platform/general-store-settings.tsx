"use client";

import { CURRENCIES, currencyOptions, storeCurrency } from "@/lib/currency";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { IconBuildingStore, IconChevronRight, IconClockHour4, IconDots, IconKeyboard, IconMapPin, IconPackage, IconPalette, IconQuestionMark, IconTransfer, IconX } from "@tabler/icons-react";
import { Input } from "@zerocraft/components/ui/input";
import { SelectField } from "@zerocraft/components/ui/select-field";

type StoreSettingsRecord = {
  id: string; name: string; slug: string;
  settings?: Record<string, unknown> & { country?: string; currency?: string; timezone?: string; contactEmail?: string; phone?: string; address?: string; transferRequest?: { email: string; status: string; requestedAt: string } };
};
type ActivityItem = { id: string; action: string; metadata: Record<string, unknown>; createdAt: string; actorName: string };
type DialogName = "business" | "contact" | "address" | "currency" | "storeCurrency" | "shortcuts" | "activity" | "changelog" | "transfer" | null;
type FormValues = Record<string, string>;

const countries = [{ value: "IN", label: "India" }, { value: "US", label: "United States" }, { value: "GB", label: "United Kingdom" }, { value: "CA", label: "Canada" }, { value: "AU", label: "Australia" }];
const countryNames = Object.fromEntries(countries.map(({ value, label }) => [value, label]));
const defaultFormats = (symbol: string) => ({ htmlWithCurrency: symbol + "{{amount}}", htmlWithoutCurrency: symbol + "{{amount}}", emailWithCurrency: symbol + "{{amount}}", emailWithoutCurrency: symbol + "{{amount}}" });
const cardClass = "overflow-hidden rounded-2xl border bg-card shadow-sm";

function SettingsSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="space-y-2.5"><div><h2 className="text-sm font-medium tracking-tight">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}</div>{children}</section>;
}
function SettingsRow({ icon: Icon, title, detail, trailing }: { icon: typeof IconBuildingStore; title: string; detail?: string; trailing?: ReactNode }) {
  return <div className="flex min-h-[58px] items-center gap-3 px-4 py-3"><Icon className="size-4 shrink-0 text-muted-foreground" stroke={1.7} /><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{title}</p>{detail && <p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p>}</div>{trailing}</div>;
}
function ActionButton({ children, onClick, disabled = false }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-muted px-3 text-xs font-medium transition hover:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-50">{children}</button>;
}
function TextField({ label, value, onChange, type = "text", maxLength, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; maxLength?: number; placeholder?: string }) {
  return <label className="grid min-w-0 gap-1.5 text-xs font-medium">{label}<Input type={type} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

export function GeneralStoreSettings() {
  const router = useRouter();
  const pathname = usePathname();
  const slug = pathname.match(/^\/store\/([^/]+)/)?.[1] || "";
  const [store, setStore] = useState<StoreSettingsRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<DialogName>(null);
  const [form, setForm] = useState<FormValues>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [unitSystem, setUnitSystem] = useState("metric");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [backupRegion, setBackupRegion] = useState("IN");
  const [fulfillment, setFulfillment] = useState("manual");
  const [autoArchive, setAutoArchive] = useState(true);
  const [prefix, setPrefix] = useState("#");
  const [suffix, setSuffix] = useState("");
  const [defaultsSaving, setDefaultsSaving] = useState(false);
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const currencyMenuRef = useRef<HTMLDivElement>(null);

  const loadStore = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/platform/stores", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Store settings could not be loaded.");
      const current = (payload.stores as StoreSettingsRecord[]).find((item) => item.slug === slug);
      if (!current) throw new Error("This store could not be found.");
      setStore(current);
      setTimezone(String(current.settings?.timezone || "Asia/Kolkata"));
      setBackupRegion(String(current.settings?.backupRegion || current.settings?.country || "IN"));
      setUnitSystem(String(current.settings?.unitSystem || "metric"));
      setWeightUnit(String(current.settings?.weightUnit || "kg"));
      setFulfillment(String(current.settings?.fulfillment || "manual"));
      setAutoArchive(typeof current.settings?.autoArchive === "boolean" ? current.settings.autoArchive : true);
      setPrefix(String(current.settings?.orderPrefix || "#"));
      setSuffix(String(current.settings?.orderSuffix || ""));
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Store settings could not be loaded."); }
    finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { void loadStore(); }, [loadStore]);

  useEffect(() => {
    if (!currencyMenuOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !currencyMenuRef.current?.contains(event.target)) setCurrencyMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setCurrencyMenuOpen(false); };
    window.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [currencyMenuOpen]);

  const regionName = useMemo(() => countryNames[String(store?.settings?.country || backupRegion)] || String(store?.settings?.country || backupRegion), [backupRegion, store?.settings?.country]);
  const currentCurrency = CURRENCIES[storeCurrency(store?.settings?.currency)];
  const currencyLabel = currencyOptions.find(option => option.value === currentCurrency.code)!.label;

  const openDialog = (name: Exclude<DialogName, null>) => {
    setCurrencyMenuOpen(false);
    setError(""); setMessage(""); setDialog(name);
    const settings = store?.settings || {};
    if (name === "business") setForm({ businessType: String(settings.businessType || "individual"), businessName: String(settings.businessName || store?.name || ""), businessFirstName: String(settings.businessFirstName || ""), businessLastName: String(settings.businessLastName || ""), businessCountry: String(settings.businessCountry || settings.country || "IN"), businessEmail: String(settings.businessEmail || settings.contactEmail || ""), businessPhone: String(settings.businessPhone || settings.phone || "") });
    if (name === "contact") setForm({ name: store?.name || "", contactEmail: String(settings.contactEmail || ""), phone: String(settings.phone || "") });
    if (name === "address") setForm({ companyName: String(settings.companyName || ""), country: String(settings.country || "IN"), address: String(settings.address || ""), address2: String(settings.address2 || ""), city: String(settings.city || ""), state: String(settings.state || ""), postalCode: String(settings.postalCode || "") });
    if (name === "storeCurrency") setForm({ currency: currentCurrency.code });
    if (name === "currency") setForm({ ...defaultFormats(currentCurrency.symbol), ...((settings.currencyFormat && typeof settings.currencyFormat === "object") ? settings.currencyFormat as FormValues : {}) });
    if (name === "transfer") setForm({ email: String(settings.transferRequest?.email || "") });
  };

  const updateForm = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const saveSettings = async (values: Record<string, unknown>, success: string) => {
    if (!store) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/platform/stores/${store.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Changes could not be saved.");
      setStore(payload.store); router.refresh(); setMessage(success); setDialog(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Changes could not be saved."); }
    finally { setSaving(false); }
  };

  const submitDialog = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (dialog === "business") void saveSettings(form, "Business details saved.");
    if (dialog === "contact") void saveSettings(form, "Store contact details saved.");
    if (dialog === "address") void saveSettings(form, form.address || form.city ? "Store address saved." : "Store address cleared.");
    if (dialog === "storeCurrency") void saveSettings({ currency: form.currency }, "Store currency saved.");
    if (dialog === "currency") void saveSettings({ currencyFormat: form }, "Currency formats saved.");
    if (dialog === "transfer") void submitTransfer();
  };

  const saveDefaults = async () => {
    if (!store || !settingsChanged) return;
    setDefaultsSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/platform/stores/${store?.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ timezone, backupRegion, unitSystem, weightUnit, fulfillment, autoArchive, orderPrefix: prefix, orderSuffix: suffix }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Store defaults could not be saved.");
      setStore(payload.store); setMessage("Store defaults saved.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Store defaults could not be saved."); }
    finally { setDefaultsSaving(false); }
  };

  const discardDefaults = () => {
    const settings = store?.settings || {};
    setTimezone(String(settings.timezone || "Asia/Kolkata"));
    setBackupRegion(String(settings.backupRegion || settings.country || "IN"));
    setUnitSystem(String(settings.unitSystem || "metric"));
    setWeightUnit(String(settings.weightUnit || "kg"));
    setFulfillment(String(settings.fulfillment || "manual"));
    setAutoArchive(typeof settings.autoArchive === "boolean" ? settings.autoArchive : true);
    setPrefix(String(settings.orderPrefix || "#"));
    setSuffix(String(settings.orderSuffix || ""));
    setError("");
    setMessage("");
  };

  const loadActivity = useCallback(async (kind: "activity" | "changelog" = "activity") => {
    if (!store) return;
    setActivityLoading(true); setActivityError("");
    try {
      const query = kind === "changelog" ? "?type=changes" : "";
      const response = await fetch(`/api/platform/stores/${store.id}/activity${query}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Store activity could not be loaded.");
      setActivity(payload.activity || []);
    } catch (cause) { setActivityError(cause instanceof Error ? cause.message : "Store activity could not be loaded."); }
    finally { setActivityLoading(false); }
  }, [store]);

  useEffect(() => { if (dialog === "activity" || dialog === "changelog") void loadActivity(dialog); }, [dialog, loadActivity]);

  const submitTransfer = async () => {
    if (!store) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/platform/stores/${store.id}/transfer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Transfer request could not be saved.");
      await loadStore(); setDialog(null); setMessage(payload.message || "Transfer request saved.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Transfer request could not be saved."); }
    finally { setSaving(false); }
  };

  const cancelTransfer = async () => {
    if (!store) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/platform/stores/${store.id}/transfer`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Transfer request could not be cancelled.");
      await loadStore(); setMessage("Transfer request cancelled.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Transfer request could not be cancelled."); }
    finally { setSaving(false); }
  };

  useEffect(() => {
    if (!dialog) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setDialog(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialog]);

  const field = (key: string, label: string, type = "text", maxLength?: number) => <TextField key={key} label={label} type={type} maxLength={maxLength} value={form[key] || ""} onChange={(value) => updateForm(key, value)} />;
  const select = (key: string, label: string, options: { value: string; label: string }[]) => <label key={key} className="grid gap-1.5 text-xs font-medium">{label}<SelectField value={form[key] || options[0]?.value || ""} onValueChange={(value) => updateForm(key, value)} options={options} /></label>;
  const settingsChanged = Boolean(store && (timezone !== String(store.settings?.timezone || "Asia/Kolkata") || backupRegion !== String(store.settings?.backupRegion || store.settings?.country || "IN") || unitSystem !== String(store.settings?.unitSystem || "metric") || weightUnit !== String(store.settings?.weightUnit || "kg") || fulfillment !== String(store.settings?.fulfillment || "manual") || autoArchive !== (typeof store.settings?.autoArchive === "boolean" ? store.settings.autoArchive : true) || prefix !== String(store.settings?.orderPrefix || "#") || suffix !== String(store.settings?.orderSuffix || "")));
  const friendlyField = (fieldName: string) => ({ name: "Store name", contactEmail: "Store email", phone: "Store phone", address: "Address", address2: "Apartment / suite", city: "City", state: "State / region", postalCode: "PIN / postal code", country: "Country / region", businessType: "Business type", businessName: "Business name", businessFirstName: "First name", businessLastName: "Last name", businessCountry: "Business country", businessEmail: "Business email", businessPhone: "Business phone", currencyFormat: "Currency display format", timezone: "Time zone", backupRegion: "Backup region", unitSystem: "Unit system", weightUnit: "Default weight unit", fulfillment: "Order fulfillment", autoArchive: "Automatic order archiving", orderPrefix: "Order ID prefix", orderSuffix: "Order ID suffix" } as Record<string, string>)[fieldName] || fieldName.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
  const activityDescription = (entry: ActivityItem, changesOnly: boolean) => {
    if (changesOnly && Array.isArray(entry.metadata?.fields) && entry.metadata.fields.length) {
      return `Updated ${entry.metadata.fields.map((fieldName) => friendlyField(String(fieldName))).join(", ")}`;
    }
    return entry.action.replaceAll(".", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  return (
    <>
      {settingsChanged && <div className="fixed inset-x-0 top-3 z-[90] flex justify-center px-4" role="status" aria-live="polite"><div className="flex items-center gap-1.5 rounded-full bg-foreground p-1.5 pl-4 text-background shadow-xl"><span className="mr-1 text-xs font-medium">Unsaved changes</span><button type="button" onClick={discardDefaults} disabled={defaultsSaving} className="h-8 rounded-full bg-background/15 px-3 text-xs font-medium transition hover:bg-background/25 disabled:opacity-50">Discard</button><button type="button" onClick={() => void saveDefaults()} disabled={defaultsSaving || !store} className="h-8 rounded-full bg-background px-3 text-xs font-semibold text-foreground transition hover:bg-background/90 disabled:opacity-60">{defaultsSaving ? "Saving…" : "Save"}</button></div></div>}
    <main className="mx-auto w-full max-w-[800px] space-y-7 pb-20">
      <h1 className="text-2xl font-medium tracking-tight">General</h1>
      {error && !dialog && <div role="alert" className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"><span>{error}</span><button type="button" className="underline" onClick={() => void loadStore()}>Retry</button></div>}
      {message && <p role="status" className="rounded-lg border bg-muted/40 px-3 py-2 text-xs">{message}</p>}

      <SettingsSection title="Business details" description="Business entity used for financial products, markets, apps, and taxes in this store.">
        <button type="button" onClick={() => openDialog("business")} disabled={!store} className={`${cardClass} flex min-h-[72px] w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-muted/20`}>
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-700"><IconBuildingStore className="size-4" /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{loading ? "Loading store…" : String(store?.settings?.businessName || store?.name || "Store")}</span><span className="mt-0.5 block text-xs text-muted-foreground">{String(store?.settings?.businessCountry ? countryNames[String(store.settings.businessCountry)] || store.settings.businessCountry : regionName)} · {String(store?.settings?.businessType || "Individual")}</span></span>
          <IconDots className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </SettingsSection>

      <SettingsSection title="Store contact details">
        <div className={cardClass}>
          <button type="button" disabled={!store} onClick={() => openDialog("contact")} className="block w-full text-left transition hover:bg-muted/30"><SettingsRow icon={IconBuildingStore} title={store?.name || "Store contact"} detail={[store?.settings?.contactEmail, store?.settings?.phone || "No phone number"].filter(Boolean).join(" · ")} trailing={<IconChevronRight className="size-4 shrink-0 text-muted-foreground" />} /></button>
          <button type="button" disabled={!store} onClick={() => openDialog("address")} className="block w-full border-t bg-muted/30 text-left transition hover:bg-muted/50"><SettingsRow icon={IconMapPin} title="Store address" detail={[store?.settings?.address, store?.settings?.city, regionName].filter(Boolean).join(" · ") || "Add a store address"} trailing={<IconChevronRight className="size-4 shrink-0 text-muted-foreground" />} /></button>
        </div>
      </SettingsSection>

      <SettingsSection title="Store defaults">
        <div className="relative rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex min-h-10 items-center gap-3"><div className="min-w-0 flex-1"><p className="text-xs font-medium">Currency display</p><p className="mt-1 text-xs text-muted-foreground">Product prices, orders, and analytics use the store currency.</p></div><span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[11px]">{currencyLabel}</span><div className="relative" ref={currencyMenuRef}><button aria-label="Currency display actions" aria-haspopup="menu" aria-expanded={currencyMenuOpen} type="button" onClick={() => setCurrencyMenuOpen((open) => !open)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"><IconDots className="size-4" /></button>{currencyMenuOpen && <div role="menu" aria-label="Currency display actions" className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg"><button role="menuitem" type="button" onClick={() => openDialog("storeCurrency")} className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-muted">Change store currency</button><button role="menuitem" type="button" onClick={() => openDialog("currency")} className="w-full rounded-lg px-3 py-2 text-left text-xs transition hover:bg-muted">Change currency formatting</button></div>}</div></div>
          </div>
        <div className={`${cardClass} p-4`}>
          <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-medium sm:col-span-2">Backup region<SelectField value={backupRegion} onValueChange={setBackupRegion} options={countries} /><span className="font-normal text-muted-foreground">Determines default settings for customers outside your markets.</span></label>
            <label className="grid gap-1.5 text-xs font-medium">Unit system<SelectField value={unitSystem} onValueChange={setUnitSystem} options={[{ value: "metric", label: "Metric system" }, { value: "imperial", label: "Imperial system" }]} /></label>
            <label className="grid gap-1.5 text-xs font-medium">Default weight unit<SelectField value={weightUnit} onValueChange={setWeightUnit} options={[{ value: "kg", label: "Kilogram (kg)" }, { value: "g", label: "Gram (g)" }, { value: "lb", label: "Pound (lb)" }, { value: "oz", label: "Ounce (oz)" }]} /></label>
            <label className="grid gap-1.5 text-xs font-medium sm:col-span-2">Time zone<SelectField value={timezone} onValueChange={setTimezone} options={[{ value: "Asia/Kolkata", label: "(GMT+05:30) India Standard Time" }, { value: "UTC", label: "(GMT+00:00) Coordinated Universal Time" }, { value: "America/New_York", label: "Eastern Time (US & Canada)" }, { value: "Europe/London", label: "London" }, { value: "Australia/Sydney", label: "Sydney" }]} /><span className="font-normal text-muted-foreground">Sets the time used for orders and analytics.</span></label>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">New products use the store currency. Existing products and orders keep their recorded currency.</p>
      </SettingsSection>

      <SettingsSection title="Order ID format" description="Shown on order pages and customer order notifications to identify each order.">
        <div className={`${cardClass} p-4 sm:p-5`}><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-xs font-medium">Prefix<Input value={prefix} maxLength={12} onChange={(event) => setPrefix(event.target.value)} /></label><label className="grid gap-1.5 text-xs font-medium">Suffix<Input value={suffix} maxLength={12} onChange={(event) => setSuffix(event.target.value)} /></label></div><p className="mt-3 text-xs text-muted-foreground">Your order ID will appear as {prefix}1001{suffix}, {prefix}1002{suffix}, …</p></div>
      </SettingsSection>

      <SettingsSection title="Order processing">
        <div className={`${cardClass} space-y-5 p-4 sm:p-5`}><fieldset className="space-y-2.5"><legend className="mb-2 text-xs font-medium">After an order has been paid</legend>{[["fulfill", "Automatically fulfill the order’s line items"], ["gift-cards", "Automatically fulfill only the gift cards in the order"], ["manual", "Don’t fulfill any of the order’s line items automatically"]].map(([value, label]) => <label key={value} className="flex cursor-pointer items-start gap-2.5 text-xs"><input type="radio" name="fulfillment" value={value} checked={fulfillment === value} onChange={() => setFulfillment(value)} className="mt-0.5 accent-foreground" /><span>{label}</span></label>)}</fieldset><fieldset className="space-y-2.5 border-t pt-4"><legend className="mb-1 text-xs font-medium">After an order has been fulfilled and paid, or when all items have been refunded</legend><label className="flex cursor-pointer items-start gap-2.5 text-xs"><input type="checkbox" checked={autoArchive} onChange={(event) => setAutoArchive(event.target.checked)} className="mt-0.5 accent-foreground" /><span><span className="block font-medium">Automatically archive the order</span><span className="mt-1 block text-muted-foreground">The order will be removed from your list of open orders.</span></span></label></fieldset></div>
      </SettingsSection>

      <SettingsSection title="Store assets"><div className={cardClass}><Link href={`/store/${slug}/content/metaobjects`} className="block transition hover:bg-muted/30"><SettingsRow icon={IconPackage} title="Metafields and metaobjects" detail="Custom data available to store content and integrations." trailing={<IconChevronRight className="size-4 shrink-0 text-muted-foreground" />} /></Link><div className="border-t"><SettingsRow icon={IconPalette} title="Brand" detail="Brand assets for consistent store presentation." trailing={<span className="rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">Coming soon</span>} /></div></div></SettingsSection>

      <SettingsSection title="Resources"><div className={cardClass}><button type="button" onClick={() => openDialog("changelog")} className="block w-full text-left transition hover:bg-muted/30"><SettingsRow icon={IconClockHour4} title="Change log" detail="Review recorded settings changes." trailing={<IconChevronRight className="size-4 shrink-0 text-muted-foreground" />} /></button><Link href="/docs" className="block border-t transition hover:bg-muted/30"><SettingsRow icon={IconQuestionMark} title="Zerocraft Help Center" detail="Read the store setup and platform guides." trailing={<IconChevronRight className="size-4 shrink-0 text-muted-foreground" />} /></Link><button type="button" onClick={() => openDialog("shortcuts")} className="block w-full border-t text-left transition hover:bg-muted/30"><SettingsRow icon={IconKeyboard} title="Keyboard shortcuts" detail="See available workspace shortcuts." trailing={<IconChevronRight className="size-4 shrink-0 text-muted-foreground" />} /></button><button type="button" onClick={() => openDialog("activity")} className="block w-full border-t text-left transition hover:bg-muted/30"><SettingsRow icon={IconClockHour4} title="Store activity log" detail="Review recent store activity." trailing={<IconChevronRight className="size-4 shrink-0 text-muted-foreground" />} /></button></div></SettingsSection>

      <SettingsSection title="Transfer store"><div className={`${cardClass} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5`}><div className="flex items-start gap-3"><IconTransfer className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><div><p className="text-xs leading-5 text-muted-foreground">Request to transfer this store to a new owner. Ownership remains unchanged until an authorized handoff is completed.</p>{store?.settings?.transferRequest?.status === "pending" && <p className="mt-2 text-xs font-medium">Pending request for {store.settings.transferRequest.email}</p>}</div></div>{store?.settings?.transferRequest?.status === "pending" ? <ActionButton onClick={() => void cancelTransfer()} disabled={saving}>{saving ? "Saving…" : "Cancel request"}</ActionButton> : <ActionButton onClick={() => openDialog("transfer")}>Manage</ActionButton>}</div></SettingsSection>

      {dialog && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}><section role="dialog" aria-modal="true" aria-labelledby="general-settings-dialog-title" className="my-auto max-h-[min(90vh,900px)] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-background shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-5 py-4"><h2 id="general-settings-dialog-title" className="text-sm font-semibold">{({ business: "Business details", contact: "Store contact details", address: "Edit store address", storeCurrency: "Change store currency", currency: "Change currency formatting", shortcuts: "Keyboard shortcuts", activity: "Store activity log", changelog: "Change log", transfer: "Transfer store" } as Record<Exclude<DialogName, null>, string>)[dialog]}</h2><button type="button" aria-label="Close dialog" onClick={() => setDialog(null)} className="rounded-lg p-2 hover:bg-muted"><IconX className="size-4" /></button></header>
        {dialog === "activity" || dialog === "changelog" ? <div className="p-5">{activityLoading ? <p className="text-sm text-muted-foreground">{dialog === "changelog" ? "Loading settings changes…" : "Loading recent activity…"}</p> : activityError ? <div role="alert" className="space-y-3 text-sm"><p className="text-destructive">{activityError}</p><ActionButton onClick={() => void loadActivity(dialog)}>Try again</ActionButton></div> : activity.length ? <div className="divide-y">{activity.map((entry) => <div key={entry.id} className="py-3 first:pt-0"><p className="text-sm">{activityDescription(entry, dialog === "changelog")}</p><p className="mt-1 text-xs text-muted-foreground">{entry.actorName} · {new Date(entry.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: timezone })}</p></div>)}</div> : <div className="rounded-xl border border-dashed p-8 text-center"><p className="text-sm font-medium">{dialog === "changelog" ? "No settings changes recorded yet" : "No activity recorded yet"}</p><p className="mt-1 text-xs text-muted-foreground">{dialog === "changelog" ? "Saved changes to this store’s settings will appear here." : "Changes made in the workspace will appear here."}</p></div>}</div> : dialog === "shortcuts" ? <div className="p-5"><h3 className="mb-2 text-xs font-semibold">General</h3><Shortcut label="Open workspace search" keys={["Ctrl", "K"]} /><Shortcut label="Close the current dialog" keys={["Esc"]} /><p className="mt-3 text-xs text-muted-foreground">On macOS, use Command instead of Ctrl. Search for a settings page by name after opening workspace search.</p></div> : <form onSubmit={submitDialog} className="space-y-4 p-5">
          {dialog === "business" && <><div className="grid gap-4 sm:grid-cols-2">{select("businessType", "Business type", [{ value: "individual", label: "Individual" }, { value: "company", label: "Company" }])}{select("businessCountry", "Country / region", countries)}</div>{form.businessType === "company" ? field("businessName", "Legal business name", "text", 120) : <div className="grid gap-4 sm:grid-cols-2">{field("businessFirstName", "First name", "text", 80)}{field("businessLastName", "Last name", "text", 80)}<div className="sm:col-span-2">{field("businessName", "Business / public name", "text", 120)}</div></div>}<div className="grid gap-4 sm:grid-cols-2">{field("businessEmail", "Business email", "email", 200)}{field("businessPhone", "Business phone", "tel", 40)}</div><p className="text-xs text-muted-foreground">Business details are stored in this store profile and can be updated by a store owner or manager.</p></>}
          {dialog === "contact" && <><TextField label="Store name" value={form.name || ""} maxLength={100} onChange={(value) => updateForm("name", value)} /><TextField label="Store email" type="email" value={form.contactEmail || ""} maxLength={200} onChange={(value) => updateForm("contactEmail", value)} /><TextField label="Store phone" type="tel" value={form.phone || ""} maxLength={40} onChange={(value) => updateForm("phone", value)} /><p className="text-xs text-muted-foreground">The contact email receives messages about your store and may be visible to customers through store policies.</p></>}
          {dialog === "address" && <><TextField label="Company name (optional)" value={form.companyName || ""} maxLength={120} onChange={(value) => updateForm("companyName", value)} />{select("country", "Country / region", countries)}<TextField label="Address" value={form.address || ""} maxLength={240} onChange={(value) => updateForm("address", value)} /><TextField label="Apartment, suite, etc. (optional)" value={form.address2 || ""} maxLength={240} onChange={(value) => updateForm("address2", value)} /><div className="grid gap-4 sm:grid-cols-3"><TextField label="City" value={form.city || ""} maxLength={100} onChange={(value) => updateForm("city", value)} /><TextField label="State / region" value={form.state || ""} maxLength={100} onChange={(value) => updateForm("state", value)} /><TextField label="PIN / postal code" value={form.postalCode || ""} maxLength={24} onChange={(value) => updateForm("postalCode", value)} /></div></>}
          {dialog === "storeCurrency" && <label className="grid gap-2 text-sm">Store currency<select className="h-9 rounded-lg border bg-background px-3" value={form.currency} onChange={event => updateForm("currency", event.target.value)}>{currencyOptions.map(({value, label}) => <option key={value} value={value}>{label}</option>)}</select><span className="text-xs text-muted-foreground">Applies to new products. Existing prices and orders keep their currency.</span></label>}
          {dialog === "currency" && <><p className="text-xs text-muted-foreground">Use <code>{"{{amount}}"}</code> where the price should appear. Preview: {form.htmlWithCurrency?.replace("{{amount}}", "1,234.50")}</p><div className="grid gap-4 sm:grid-cols-2">{field("htmlWithCurrency", "HTML with currency", "text", 100)}{field("htmlWithoutCurrency", "HTML without currency", "text", 100)}{field("emailWithCurrency", "Email with currency", "text", 100)}{field("emailWithoutCurrency", "Email without currency", "text", 100)}</div><p className="text-xs text-muted-foreground">These display templates are saved with this store. Existing order records and their original amounts are not modified.</p></>}
          {dialog === "transfer" && <><div className="rounded-lg border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">This records a transfer request for review. It does not send an invitation or change store ownership/access automatically.</div><TextField label="New owner email address" type="email" value={form.email || ""} maxLength={200} onChange={(value) => updateForm("email", value)} /><p className="text-xs text-muted-foreground">An authorized owner handoff must be completed separately before access changes.</p></>}
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          <footer className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setDialog(null)} className="h-9 rounded-lg border px-3 text-xs font-medium hover:bg-muted">Cancel</button><button type="submit" disabled={saving || (dialog === "storeCurrency" && form.currency === currentCurrency.code)} className="h-9 rounded-lg bg-foreground px-3 text-xs font-medium text-background hover:opacity-90 disabled:opacity-50">{saving ? "Saving…" : dialog === "transfer" ? "Save request" : "Save"}</button></footer>
        </form>}
      </section></div>}
    </main>
    </>
  );
}

function Shortcut({ label, keys }: { label: string; keys: string[] }) {
  return <div className="flex min-h-10 items-center justify-between gap-3 border-b py-2 text-xs"><span>{label}</span><span className="flex gap-1">{keys.map((key) => <kbd key={key} className="rounded border bg-muted px-1.5 py-1 font-mono text-[10px]">{key}</kbd>)}</span></div>;
}
