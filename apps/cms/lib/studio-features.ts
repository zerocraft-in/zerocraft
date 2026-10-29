export const STUDIO_FEATURE_KEYS = [
  "crm",
  "content",
  "commerce",
  "email",
  "automation",
  "analytics",
  "search_console",
] as const;

export type StudioFeatureKey = (typeof STUDIO_FEATURE_KEYS)[number];

export type StudioFeature = {
  key: StudioFeatureKey;
  name: string;
  description: string;
  enabled: boolean;
};

export const STUDIO_FEATURES: readonly StudioFeature[] = [
  { key: "crm", name: "Clients & leads", description: "Lead pipeline, client records and appointments.", enabled: true },
  { key: "content", name: "Content studio", description: "Works, projects, journal and media publishing.", enabled: true },
  { key: "commerce", name: "Commerce", description: "Store, catalogue, inventory and orders.", enabled: true },
  { key: "email", name: "Email workspace", description: "Inbox, drafts and studio email delivery.", enabled: true },
  { key: "automation", name: "Automation hub", description: "Triggers, webhooks, retries and notifications.", enabled: true },
  { key: "analytics", name: "Growth & analytics", description: "GA4, Search Console and attribution reporting.", enabled: false },
  { key: "search_console", name: "Search Console", description: "Search queries, indexing signals and sitemap health.", enabled: true },
];

export function isStudioFeatureKey(value: unknown): value is StudioFeatureKey {
  return typeof value === "string" && STUDIO_FEATURE_KEYS.includes(value as StudioFeatureKey);
}
