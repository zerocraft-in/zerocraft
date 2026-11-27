import {
  IconActivity,
  IconBrandGoogle,
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconChartBar,
  IconMail,
  IconPhoto,
  IconSearch,
  IconSettings,
  IconShoppingBag,
  IconSparkles,
  IconUsers,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import type { CommerceFeatureKey } from "@/lib/commerce-features";

export type CommerceAppKind = "app" | "integration";
export type CommerceAppStatus = "active" | "ready" | "planned" | "attention";

export type CommerceApp = {
  id: string;
  name: string;
  description: string;
  kind: CommerceAppKind;
  category: string;
  status: CommerceAppStatus;
  href?: string;
  icon: ComponentType<{ className?: string; stroke?: number }>;
  accent: string;
  capabilities: string[];
  feature?: CommerceFeatureKey;
};

export const COMMERCE_APPS: CommerceApp[] = [
  { id: "content", name: "Store content", description: "Manage store pages, navigation, blog posts, and media.", kind: "app", category: "Content", status: "active", href: "/store/content", icon: IconPhoto, accent: "bg-violet-500/10 text-violet-600 dark:text-violet-300", capabilities: ["Pages", "Menus", "Blog posts"], feature: "content" },
  { id: "commerce", name: "Commerce", description: "Run products, catalogue, inventory, orders, and customer fulfilment.", kind: "app", category: "Operations", status: "active", href: "/store", icon: IconShoppingBag, accent: "bg-amber-500/10 text-amber-600 dark:text-amber-300", capabilities: ["Products", "Orders", "Inventory"], feature: "commerce" },
  { id: "email", name: "Email workspace", description: "Read, draft, send, and track client and order communication.", kind: "app", category: "Operations", status: "ready", href: "/settings/integrations", icon: IconMail, accent: "bg-rose-500/10 text-rose-600 dark:text-rose-300", capabilities: ["Inbox", "Drafts", "Delivery events"], feature: "email" },
  { id: "analytics", name: "Google Analytics", description: "Bring website acquisition, conversions, and campaign performance into Commerce.", kind: "integration", category: "Analytics", status: "planned", icon: IconChartBar, accent: "bg-orange-500/10 text-orange-600 dark:text-orange-300", capabilities: ["Traffic", "Conversions", "UTM attribution"], feature: "analytics" },
  { id: "search-console", name: "Search Console", description: "Monitor indexing, search queries, and technical SEO signals.", kind: "integration", category: "Growth", status: "ready", href: "/system/search-console", icon: IconSearch, accent: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300", capabilities: ["Search queries", "Indexing", "Sitemap health"], feature: "search_console" },
  { id: "whatsapp", name: "WhatsApp Business", description: "Turn customer enquiries into conversations with templates and CTA tracking.", kind: "integration", category: "Growth", status: "ready", icon: IconBrandWhatsapp, accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300", capabilities: ["CTA tracking", "Quick replies", "Lead handoff"] },
  { id: "instagram", name: "Instagram", description: "Connect social publishing signals and campaign attribution to store customers.", kind: "integration", category: "Growth", status: "planned", icon: IconBrandInstagram, accent: "bg-pink-500/10 text-pink-600 dark:text-pink-300", capabilities: ["Profile clicks", "Campaigns", "Publishing"] },
  { id: "google-business", name: "Google Business Profile", description: "Track verification, profile visibility, calls, and review growth.", kind: "integration", category: "Growth", status: "planned", icon: IconBrandGoogle, accent: "bg-sky-500/10 text-sky-600 dark:text-sky-300", capabilities: ["Profile status", "Reviews", "Local discovery"] },
  { id: "automation-hub", name: "Automation hub", description: "Connect triggers, actions, retries, and operational event history.", kind: "app", category: "System", status: "active", href: "/system/automations", icon: IconSparkles, accent: "bg-lime-500/10 text-lime-700 dark:text-lime-300", capabilities: ["Triggers", "Retries", "Health checks"], feature: "automation" },
  { id: "system-settings", name: "System settings", description: "Control access, devices, notifications, and workspace configuration.", kind: "app", category: "System", status: "active", href: "/settings", icon: IconSettings, accent: "bg-slate-500/10 text-slate-600 dark:text-slate-300", capabilities: ["RBAC", "Notifications", "Workspace"] },
];

export const COMMERCE_APP_STATUS_LABELS: Record<CommerceAppStatus, string> = {
  active: "Active",
  ready: "Ready to connect",
  planned: "Coming next",
  attention: "Needs attention",
};
