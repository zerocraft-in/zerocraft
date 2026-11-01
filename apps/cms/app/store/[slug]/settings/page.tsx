"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import {
  IconApps, IconBell, IconBuildingStore, IconCreditCard, IconDatabase,
  IconFileText, IconGlobe, IconLanguage, IconLock, IconMapPin, IconReceipt,
  IconShoppingCart, IconSparkles, IconTruck, IconUser, IconUsers, IconWorld,
} from "@tabler/icons-react";
import { Badge } from "@zerocraft/components/ui/badge";
import { Button } from "@zerocraft/components/ui/button";
import { Card, CardContent } from "@zerocraft/components/ui/card";
import { Switch } from "@zerocraft/components/ui/switch";
import { unscopedPath } from "@/lib/platform/scope";
import { GeneralStoreSettings } from "@/components/platform/general-store-settings";
import { CheckoutSettings } from "@/components/platform/checkout-settings";
import { PrivacySettings } from "@/components/platform/privacy-settings";
import { MetafieldsSettings } from "@/components/platform/metafields-settings";
import { NotificationsSettings } from "@/components/platform/notifications-settings";
import { DomainsSettings } from "@/components/platform/domains-settings";
import { LanguagesSettings } from "@/components/platform/languages-settings";
import { CustomerEventsSettings } from "@/components/platform/customer-events-settings";
import { AppsSettings } from "@/components/platform/apps-settings";
import { LocationsSettings } from "@/components/platform/locations-settings";
import { BillingSettings, CustomerAccountsSettings, PaymentsSettings, PlanSettings, ShippingSettings, TaxesSettings } from "@/components/platform/commerce-settings-pages";

type SettingKey = "general" | "plan" | "billing" | "users" | "payments" | "checkout" | "customer-accounts" | "shipping" | "taxes" | "locations" | "apps" | "sales-channels" | "domains" | "customer-events" | "notifications" | "custom-data" | "languages" | "privacy" | "policies";
type SettingDefinition = { key: SettingKey; label: string; description: string; icon: ComponentType<{ className?: string; stroke?: number }> };

const settings: readonly SettingDefinition[] = [
  ["general", "General", "Store details and defaults", IconBuildingStore],
  ["plan", "Plan", "Plan, limits, and feature access", IconCreditCard],
  ["billing", "Billing", "Invoices and billing profile", IconReceipt],
  ["users", "Users", "Users and permissions", IconUsers],
  ["payments", "Payments", "Payment providers and payouts", IconCreditCard],
  ["checkout", "Checkout", "Checkout and order processing", IconShoppingCart],
  ["customer-accounts", "Customer accounts", "Customer sign-in and account settings", IconUser],
  ["shipping", "Shipping and delivery", "Shipping accounts and delivery methods", IconTruck],
  ["taxes", "Taxes and duties", "Tax regions and collection", IconReceipt],
  ["locations", "Locations", "Inventory and fulfillment locations", IconMapPin],
  ["apps", "Apps", "Installed apps and permissions", IconApps],
  ["sales-channels", "Sales channels", "Connected publishing channels", IconWorld],
  ["domains", "Domains", "Domains, DNS, and SSL", IconGlobe],
  ["customer-events", "Customer events", "Pixels and event destinations", IconSparkles],
  ["notifications", "Notifications", "Staff and customer notifications", IconBell],
  ["custom-data", "Metafields and metaobjects", "Custom fields and content models", IconDatabase],
  ["languages", "Languages", "Store and checkout languages", IconLanguage],
  ["privacy", "Customer privacy", "Consent and data controls", IconLock],
  ["policies", "Policies", "Refund, privacy, and legal policies", IconFileText],
].map(([key, label, description, icon]) => ({ key: key as SettingKey, label, description, icon })) as readonly SettingDefinition[];

function CardSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="space-y-3"><div><h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}</div><Card className="border-border/80 shadow-none">{children}</Card></section>;
}

function Row({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <div className="flex min-h-[68px] items-center gap-4 border-b border-border/70 px-5 py-4 last:border-b-0"><div className="min-w-0 flex-1"><p className="text-[13px] font-medium">{title}</p>{description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}</div><div className="shrink-0">{children}</div></div>;
}

function StateBadge({ children, warning = false }: { children: ReactNode; warning?: boolean }) {
  return <Badge variant="outline" className={`gap-1.5 ${warning ? "border-amber-500/40 text-amber-700" : "border-emerald-500/40 text-emerald-700"}`}><span className={`size-1.5 rounded-full ${warning ? "bg-amber-500" : "bg-emerald-500"}`} />{children}</Badge>;
}

const sectionRows: Record<SettingKey, string[]> = {
  general: [], plan: ["Plan details", "Billing cycle", "Store limits"], billing: ["Billing profile", "Payment method", "Invoices"], users: ["Users and permissions", "Roles", "Pending invitations"], payments: ["Payment providers", "Manual payment methods", "Payouts"], checkout: ["Customer information", "Order processing", "Checkout branding"], "customer-accounts": ["Account mode", "Sign-in links", "Saved payment methods"], shipping: ["Shipping accounts", "Shipping zones", "Local delivery"], taxes: ["Tax regions", "Tax registrations", "Duties and imports"], locations: ["Locations", "Fulfillment priority", "Pickup availability"], apps: ["Installed apps", "App permissions", "App billing"], "sales-channels": ["Online Store", "Connected channels", "Channel permissions"], domains: ["Primary domain", "Connected domains", "DNS and SSL"], "customer-events": ["Customer events", "Pixels", "Event testing"], notifications: ["Staff notifications", "Customer notifications", "Email templates"], "custom-data": ["Products and variants", "Customers and orders", "Metaobjects"], languages: ["Store languages", "Checkout languages", "Translation status"], privacy: ["Privacy policy", "Cookie banner", "Data sharing opt-out"], policies: ["Refund policy", "Privacy policy", "Terms of service"],
};

function SectionPage({ item }: { item: SettingDefinition }) {
  const rows = sectionRows[item.key];
  return <div className="space-y-8"><CardSection title={rows[0]} description={item.description}><CardContent className="p-0"><Row title={rows[0]} description={`Manage ${rows[0].toLowerCase()} for your store.`}><StateBadge>{item.key === "plan" ? "Trial" : "Configured"}</StateBadge></Row><Row title={rows[1]} description={`Configure ${rows[1].toLowerCase()} and related options.`}><Button variant="outline" size="sm">Manage</Button></Row><Row title={rows[2]} description={`Review and update ${rows[2].toLowerCase()}.`}><Button variant="outline" size="sm">View</Button></Row></CardContent></CardSection><CardSection title="Additional settings" description="These settings are saved to your store and protected by permissions."><CardContent className="p-0"><Row title="Save changes automatically" description="Keep your latest configuration ready while you work."><Switch defaultChecked /></Row><Row title="Activity history" description="Review changes made by staff and connected apps."><Button variant="outline" size="sm" nativeButton={false} render={<Link href="/system/audit-logs" />}>View log</Button></Row></CardContent></CardSection></div>;
}

export default function CommerceSettingsPage() {
  const pathname = usePathname();
  const routeKey = unscopedPath(pathname).split("/")[2] as SettingKey | undefined;
  const active = settings.find((item) => item.key === routeKey) ?? settings[0];
  const ActiveIcon = active.icon;
  if (active.key === "general") return <GeneralStoreSettings />;
  if (active.key === "checkout") return <CheckoutSettings pathname={pathname} />;
  if (active.key === "privacy") return <PrivacySettings pathname={pathname} />;
  if (active.key === "custom-data") return <MetafieldsSettings pathname={pathname} />;
  if (active.key === "notifications") return <NotificationsSettings pathname={pathname} />;
  if (active.key === "domains") return <DomainsSettings pathname={pathname} />;
  if (active.key === "languages") return <LanguagesSettings />;
  if (active.key === "customer-events") return <CustomerEventsSettings pathname={pathname} />;
  if (active.key === "apps") return <AppsSettings pathname={pathname} />;
  if (active.key === "locations") return <LocationsSettings />;
  if (active.key === "taxes") return <TaxesSettings pathname={pathname} />;
  if (active.key === "shipping") return <ShippingSettings pathname={pathname} />;
  if (active.key === "customer-accounts") return <CustomerAccountsSettings pathname={pathname} />;
  if (active.key === "payments") return <PaymentsSettings pathname={pathname} />;
  if (active.key === "plan") return <PlanSettings pathname={pathname} />;
  if (active.key === "billing") return <BillingSettings pathname={pathname} />;
  return <main className="mx-auto w-full max-w-[920px] pb-20"><header className="mb-8 flex items-start gap-3 border-b border-border/70 pb-6"><span className="mt-0.5 grid size-8 place-items-center rounded-lg border border-border bg-muted/50"><ActiveIcon className="size-4 text-muted-foreground" /></span><div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">Settings</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">{active.label}</h1><p className="mt-1 text-sm text-muted-foreground">{active.description}</p></div><StateBadge>Saved</StateBadge></header><SectionPage item={active} /></main>;
}
