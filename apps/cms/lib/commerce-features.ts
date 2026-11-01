export const COMMERCE_FEATURE_KEYS = [
  "content",
  "commerce",
  "email",
  "automation",
  "analytics",
  "search_console",
  "assistant",
] as const;

export type CommerceFeatureKey = (typeof COMMERCE_FEATURE_KEYS)[number];

export type CommerceFeature = {
  key: CommerceFeatureKey;
  name: string;
  description: string;
  enabled: boolean;
};

export const COMMERCE_FEATURES: readonly CommerceFeature[] = [
  { key: "content", name: "Store content", description: "Store pages, menus, blog posts, and media.", enabled: true },
  { key: "commerce", name: "Commerce", description: "Store, catalogue, inventory and orders.", enabled: true },
  { key: "email", name: "Email workspace", description: "Inbox, drafts and studio email delivery.", enabled: true },
  { key: "automation", name: "Automation hub", description: "Triggers, webhooks, retries and notifications.", enabled: true },
  { key: "analytics", name: "Growth & analytics", description: "GA4, Search Console and attribution reporting.", enabled: true },
  { key: "search_console", name: "Search Console", description: "Search queries, indexing signals and sitemap health.", enabled: true },
  { key: "assistant", name: "AI command center", description: "Text, voice and natural-language workspace navigation.", enabled: true },
];

export function isCommerceFeatureKey(value: unknown): value is CommerceFeatureKey {
  return typeof value === "string" && COMMERCE_FEATURE_KEYS.includes(value as CommerceFeatureKey);
}
