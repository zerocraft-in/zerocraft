"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { IconArrowUpRight, IconCreditCard, IconReceipt, IconShieldLock, IconTruck } from "@tabler/icons-react";
import { scopedPath } from "@/lib/platform/scope";

const card = "overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm";

function Page({ title, children, pathname, wide = false }: { title: string; children: ReactNode; pathname?: string; wide?: boolean }) {
  return <main data-settings-path={pathname} className={`mx-auto w-full ${wide ? "max-w-none" : "max-w-[800px]"} space-y-7 pb-20`}><h1 className="text-2xl font-medium tracking-tight">{title}</h1>{children}</main>;
}
function Section({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return <section className="space-y-2.5"><div className="flex items-end justify-between gap-3"><div><h2 className="text-sm font-medium">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}</div>{action}</div>{children}</section>;
}
function Panel({ children, className = "" }: { children: ReactNode; className?: string }) { return <div className={`${card} ${className}`}>{children}</div>; }
function Row({ title, description, trailing, icon }: { title: string; description?: string; trailing?: ReactNode; icon?: ReactNode }) {
  return <div className="flex min-h-[62px] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-0"><span className="grid size-5 shrink-0 place-items-center text-muted-foreground">{icon}</span><div className="min-w-0 flex-1"><p className="text-xs font-medium">{title}</p>{description && <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{description}</p>}</div>{trailing && <div className="shrink-0">{trailing}</div>}</div>;
}
function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "green" | "amber" }) { return <span className={`rounded-md px-2 py-1 text-[10px] font-medium ${tone === "green" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : tone === "amber" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-muted text-muted-foreground"}`}>{children}</span>; }
function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" }) { return <div className={`rounded-2xl px-4 py-3 text-xs leading-5 ${tone === "info" ? "bg-sky-500/10 text-sky-900 dark:text-sky-200" : "bg-amber-500/15 text-amber-900 dark:text-amber-200"}`}>{children}</div>; }
function LinkButton({ href, pathname, children }: { href: string; pathname: string; children: ReactNode }) { return <Link href={scopedPath(href, pathname)} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-3 text-[11px] font-medium hover:bg-muted/70">{children}</Link>; }

type StoreRow = { slug: string; name: string; status: string; setup_completed_at: string | null; settings: Record<string, unknown> | null };
function useStore(pathname: string) {
  const [store, setStore] = useState<StoreRow | null>(null);
  useEffect(() => { let live = true; void fetch("/api/platform/stores", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((p) => { const slug = pathname.split("/")[2]; if (live) setStore((p?.stores || []).find((s: StoreRow) => s.slug === slug) || null); }).catch(() => undefined); return () => { live = false; }; }, [pathname]);
  return store;
}

export function TaxesSettings({ pathname }: { pathname: string }) {
  const store = useStore(pathname); const settings = store?.settings || {};
  const countryCode = String(settings.country || "");
  const country = countryCode ? new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) || countryCode : "Not set";
  return <Page title="Taxes and duties" pathname={pathname}>
    <Section title="Tax service" action={<Badge>Unavailable</Badge>}><Panel><Row title="Automatic tax collection" description="Automatic tax service status is not exposed by this store settings service." icon={<IconReceipt className="size-4" />} /></Panel></Section>
    <Section title="Tax regions" description="The store country is shown below. Tax registrations and collection status are not available here."><Panel><div className="grid grid-cols-[1fr_130px] bg-muted/40 px-4 py-2 text-[10px] font-medium text-muted-foreground"><span>Region</span><span>Collection</span></div><Row title={country} description="Store country/region" trailing={<Badge>Status unavailable</Badge>} icon={<IconReceipt className="size-4" />} /><div className="border-t px-4 py-3 text-[11px] text-muted-foreground">Tax registration and collection settings are not stored in this CMS yet.</div></Panel></Section>
    <Section title="Duties and import taxes" description="Configure import duties at checkout for international orders."><Panel><Row title="Import duties at checkout" description="Duty collection settings are not available in this CMS." trailing={<Badge>Unavailable</Badge>} icon={<IconReceipt className="size-4" />} /></Panel></Section>
    <Section title="Additional configuration"><Panel><Row title="Tax-inclusive pricing" description="The saved tax-inclusive pricing preference is not available here." trailing={<Badge>Unavailable</Badge>} icon={<IconReceipt className="size-4" />} /><Row title="Tax on shipping" description="Shipping tax rules are not available here." trailing={<Badge>Unavailable</Badge>} icon={<IconTruck className="size-4" />} /></Panel></Section>
  </Page>;
}

export function ShippingSettings({ pathname }: { pathname: string }) {
  return <Page title="Shipping and delivery" pathname={pathname}>
    <Section title="Shipping"><Panel>
      <Row title="Shipping profiles" description="Shipping zones and carrier rates are not managed by the current store settings service." trailing={<Badge>Unavailable</Badge>} icon={<IconTruck className="size-4" />} />
      <Row title="Checkout delivery options" description="Standard, express, and overnight delivery are supported checkout methods; no rates are attached." trailing={<Badge>Checkout</Badge>} icon={<IconTruck className="size-4" />} />
      <Row title="Fulfillable inventory" description="Manage the locations used to fulfill store orders." trailing={<LinkButton href="/settings/locations" pathname={pathname}>Locations <IconArrowUpRight className="size-3" /></LinkButton>} icon={<IconTruck className="size-4" />} />
      <Row title="Shipping labels" description="Carrier labels and negotiated rates are not connected." trailing={<Badge>Unavailable</Badge>} icon={<IconTruck className="size-4" />} />
      <Row title="Packages and carrier accounts" description="Package dimensions and carrier credentials are not managed here." trailing={<Badge>Unavailable</Badge>} icon={<IconTruck className="size-4" />} />
    </Panel></Section>
    <Section title="Additional delivery methods"><Panel><Row title="Local delivery" description="Local delivery settings are not available here." trailing={<Badge>Status unavailable</Badge>} icon={<IconTruck className="size-4" />} /><Row title="Pickup in store" description="Pickup settings are not available here." trailing={<Badge>Status unavailable</Badge>} icon={<IconTruck className="size-4" />} /></Panel></Section>
    <Section title="Documents"><Panel><Row title="Packing slip" description="Packing slip templates are not managed here." trailing={<Badge>—</Badge>} icon={<IconReceipt className="size-4" />} /></Panel></Section>
  </Page>;
}

export function CustomerAccountsSettings({ pathname }: { pathname: string }) {
  return <Page title="Customer accounts" pathname={pathname}>
    <Section title="Sign-in links"><Panel><Row title="Customer sign-in at checkout" description="Customer authentication is currently required by the checkout flow." trailing={<Badge tone="green">Required</Badge>} icon={<IconShieldLock className="size-4" />} /></Panel></Section>
    <Section title="Customer accounts" description="Account and checkout behavior is managed alongside checkout configuration."><Panel>
      <Row title="Checkout configuration" description="Manage customer details and sign-in requirements for checkout." trailing={<LinkButton href="/settings/checkout" pathname={pathname}>Open <IconArrowUpRight className="size-3" /></LinkButton>} icon={<IconShieldLock className="size-4" />} />
      <Row title="Authentication methods" description="Separate customer account authentication settings are not available here." trailing={<Badge>Unavailable</Badge>} icon={<IconShieldLock className="size-4" />} />
      <Row title="Self-serve returns and store credit" description="Returns and customer credit are not configured for this store." trailing={<Badge>Unavailable</Badge>} icon={<IconReceipt className="size-4" />} />
      <Row title="Customer account URL" description="Customer account URL settings are not managed here." trailing={<Badge>Unavailable</Badge>} icon={<IconArrowUpRight className="size-4" />} />
    </Panel></Section>
  </Page>;
}

type PaymentMethod = { method_code: string; display_name: string; merchant_name: string | null };
export function PaymentsSettings({ pathname }: { pathname: string }) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]); const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => { let live = true; void fetch("/api/admin/settings/payment-methods", { cache: "no-store" }).then(async (r) => { const p = await r.json(); if (!r.ok) throw new Error(p.error || "Payment methods could not be loaded."); return p; }).then((p) => { if (live) { setMethods(p.methods || []); setState("ready"); } }).catch(() => { if (live) setState("error"); }); return () => { live = false; }; }, []);
  return <Page title="Payments" pathname={pathname}>
    <Notice tone="warning">Payment provider connections and payment processing controls are managed by your store environment. This page shows enabled manual payment methods only.</Notice>
    <Section title="Payment providers" description="Providers that enable customers to pay online."><Panel><Row title="Online payment provider" description="Provider connection details are not exposed by this settings service." trailing={<Badge>Status unavailable</Badge>} icon={<IconCreditCard className="size-4" />} /></Panel></Section>
    <Section title="More ways to pay" description="Enabled manual payment methods configured for this store."><Panel>{state === "loading" ? <p className="px-4 py-6 text-xs text-muted-foreground">Loading payment methods…</p> : state === "error" ? <p role="status" className="px-4 py-6 text-xs text-muted-foreground">Payment methods could not be loaded. Check settings permission and refresh.</p> : methods.length ? methods.map((method) => <Row key={method.method_code} title={method.display_name} description={method.merchant_name || method.method_code} trailing={<Badge tone="green">Active</Badge>} icon={<IconCreditCard className="size-4" />} />) : <div className="px-4 py-8 text-center"><p className="text-xs font-medium">No enabled payment methods</p><p className="mt-1 text-[11px] text-muted-foreground">Enable a manual payment method in payment settings when that workflow is available.</p></div>}</Panel></Section>
    <Section title="Manual payment methods" description="Cash on delivery, UPI, and bank transfer availability is controlled by configured payment methods."><Panel><Row title="Method configuration" description="Payment credentials are intentionally not shown in this overview." trailing={<Badge>Protected</Badge>} icon={<IconShieldLock className="size-4" />} /></Panel></Section>
    <Section title="Payment configuration"><Panel><Row title="Capture method, customizations, and gift cards" description="These provider-specific settings are not exposed in this CMS yet." trailing={<Badge>Unavailable</Badge>} icon={<IconCreditCard className="size-4" />} /></Panel></Section>
  </Page>;
}

export function PlanSettings({ pathname }: { pathname: string }) {
  const store = useStore(pathname);
  return <Page title="Plan" pathname={pathname}>
    <Section title="Plan details" action={<Badge>{store?.status === "ready" ? "Ready" : store ? store.status : "Loading"}</Badge>}><Panel><Row title="Store plan" description="Plan name and billing entitlements are not tracked in the current platform database." trailing={<Badge>Not recorded</Badge>} icon={<IconCreditCard className="size-4" />} /><Row title="Store setup" description={store?.setup_completed_at ? "Initial setup has been completed." : "Setup completion is not recorded."} trailing={<Badge tone={store?.setup_completed_at ? "green" : "muted"}>{store?.setup_completed_at ? "Complete" : "Pending"}</Badge>} icon={<IconShieldLock className="size-4" />} /></Panel></Section>
    <p className="text-center text-xs text-muted-foreground">Plan upgrades and store lifecycle controls are not available from this CMS.</p>
  </Page>;
}

export function BillingSettings({ pathname }: { pathname: string }) {
  return <Page title="Billing" pathname={pathname} wide>
    <Section title="Current billing cycle"><Panel><div className="px-5 py-5"><p className="text-sm font-medium">No billing cycle is recorded</p><p className="mt-1 text-xs text-muted-foreground">This store does not have billing totals or cycle dates available in the platform database.</p></div><div className="border-t px-5 py-3"><Link href={scopedPath("/settings/general", pathname)} className="text-xs font-medium hover:underline">Review store details</Link></div></Panel></Section>
    <Section title="Past bills" description="Invoices and payment history for this store."><Panel><div className="px-5 py-10 text-center"><IconReceipt className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-xs font-medium">No bills available</p><p className="mt-1 text-[11px] text-muted-foreground">Billing records are not connected to the CMS yet.</p></div></Panel></Section>
  </Page>;
}
