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
import type { StudioFeatureKey } from "@/lib/studio-features";

export type StudioAppKind = "app" | "integration";
export type StudioAppStatus = "active" | "ready" | "planned" | "attention";

export type StudioApp = {
  id: string;
  name: string;
  description: string;
  kind: StudioAppKind;
  category: string;
  status: StudioAppStatus;
  href?: string;
  icon: ComponentType<{ className?: string; stroke?: number }>;
  accent: string;
  capabilities: string[];
  feature?: StudioFeatureKey;
};

export const STUDIO_APPS: StudioApp[] = [
  { id: "studio-dashboard", name: "Studio dashboard", description: "Your daily operating pulse, setup progress, and recent activity.", kind: "app", category: "Core", status: "active", href: "/", icon: IconActivity, accent: "bg-foreground text-background", capabilities: ["Overview", "Activity", "Quick actions"] },
  { id: "crm", name: "Clients & leads", description: "Manage enquiries, client context, and the studio relationship timeline.", kind: "app", category: "Studio", status: "active", href: "/leads", icon: IconUsers, accent: "bg-blue-500/10 text-blue-600 dark:text-blue-300", capabilities: ["Client records", "Lead pipeline", "Appointments"], feature: "crm" },
  { id: "content", name: "Content studio", description: "Publish pages, works, journal entries, media, and portfolio updates.", kind: "app", category: "Studio", status: "active", href: "/content", icon: IconPhoto, accent: "bg-violet-500/10 text-violet-600 dark:text-violet-300", capabilities: ["Pages", "Works", "Journal"], feature: "content" },
  { id: "commerce", name: "Commerce", description: "Run products, catalogue, inventory, orders, and customer fulfilment.", kind: "app", category: "Operations", status: "active", href: "/store", icon: IconShoppingBag, accent: "bg-amber-500/10 text-amber-600 dark:text-amber-300", capabilities: ["Products", "Orders", "Inventory"], feature: "commerce" },
  { id: "email", name: "Email workspace", description: "Read, draft, send, and track client and order communication.", kind: "app", category: "Operations", status: "ready", href: "/studio/email", icon: IconMail, accent: "bg-rose-500/10 text-rose-600 dark:text-rose-300", capabilities: ["Inbox", "Drafts", "Delivery events"], feature: "email" },
  { id: "analytics", name: "Google Analytics", description: "Bring website acquisition, conversions, and campaign performance into Studio.", kind: "integration", category: "Analytics", status: "planned", icon: IconChartBar, accent: "bg-orange-500/10 text-orange-600 dark:text-orange-300", capabilities: ["Traffic", "Conversions", "UTM attribution"], feature: "analytics" },
  { id: "search-console", name: "Search Console", description: "Monitor indexing, search queries, and technical SEO signals.", kind: "integration", category: "Growth", status: "ready", href: "/search-console", icon: IconSearch, accent: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300", capabilities: ["Search queries", "Indexing", "Sitemap health"], feature: "search_console" },
  { id: "whatsapp", name: "WhatsApp Business", description: "Turn project enquiries into conversations with templates and CTA tracking.", kind: "integration", category: "Growth", status: "ready", icon: IconBrandWhatsapp, accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300", capabilities: ["CTA tracking", "Quick replies", "Lead handoff"] },
  { id: "instagram", name: "Instagram", description: "Connect social publishing signals and campaign attribution to studio leads.", kind: "integration", category: "Growth", status: "planned", icon: IconBrandInstagram, accent: "bg-pink-500/10 text-pink-600 dark:text-pink-300", capabilities: ["Profile clicks", "Campaigns", "Publishing"] },
  { id: "google-business", name: "Google Business Profile", description: "Track verification, profile visibility, calls, and review growth.", kind: "integration", category: "Growth", status: "planned", icon: IconBrandGoogle, accent: "bg-sky-500/10 text-sky-600 dark:text-sky-300", capabilities: ["Profile status", "Reviews", "Local discovery"] },
  { id: "automation-hub", name: "Automation hub", description: "Connect triggers, actions, retries, and operational event history.", kind: "app", category: "System", status: "active", href: "/automations", icon: IconSparkles, accent: "bg-lime-500/10 text-lime-700 dark:text-lime-300", capabilities: ["Triggers", "Retries", "Health checks"], feature: "automation" },
  { id: "system-settings", name: "System settings", description: "Control access, devices, notifications, and workspace configuration.", kind: "app", category: "System", status: "active", href: "/settings", icon: IconSettings, accent: "bg-slate-500/10 text-slate-600 dark:text-slate-300", capabilities: ["RBAC", "Notifications", "Workspace"] },
];

export const STUDIO_APP_STATUS_LABELS: Record<StudioAppStatus, string> = {
  active: "Active",
  ready: "Ready to connect",
  planned: "Coming next",
  attention: "Needs attention",
};
