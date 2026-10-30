export const ADMIN_ROUTES = {
  overview: "/studio",
  studio: {
    overview: "/studio",
    crm: "/studio/crm",
    content: "/studio/content",
    works: "/studio/works",
    email: "/studio/email",
    clients: "/studio/clients",
    leads: "/studio/leads",
    projects: "/studio/projects",
    appointments: "/studio/appointments",
    blogs: "/studio/blogs",
    segments: "/studio/customers/segments",
    companies: "/studio/customers/companies",
    metaobjects: "/studio/content/metaobjects",
    files: "/studio/content/files",
    menus: "/studio/content/menus",
    blogPosts: "/studio/content/blog-posts",
  },
  store: {
    overview: "/store",
    drafts: "/store/orders/drafts",
    products: "/store/products",
    customers: "/store/customers",
    growth: "/growth",
    discounts: "/store/discounts",
    content: "/store/content",
    markets: "/store/markets",
    analytics: "/analytics",
    categories: "/store/categories",
    recycleBin: "/store/bin",
    mediaLibrary: "/media-library",
    inventory: "/store/inventory",
    channels: "/channels",
  },
  operations: {
    orders: "/store/orders",
    purchaseOrders: "/store/orders/purchase-orders",
    transfers: "/store/inventory/transfers",
    giftCards: "/store/gift-cards",
    reports: "/reports",
    analytics: "/analytics",
    reportLibrary: "/reports/library",
    liveView: "/analytics/live-view",
    growth: "/growth",
    searchConsole: "/search-console",
    transactions: "/transactions",
    subscriptions: "/subscriptions",
    disputes: "/disputes",
  },
  staff: {
    scheduling: "/scheduling",
    timeTracking: "/time-tracking",
    team: "/team",
  },
  updates: {
    whatsNew: "/whats-new",
  },
  system: {
    overview: "/system",
    settings: "/settings",
    devices: "/devices",
    integrations: "/integrations",
    auditLogs: "/audit-logs",
    emailEvents: "/email-events",
    automations: "/automations",
    approvals: "/automations/approvals",
    notifications: "/notifications",
    notificationReports: "/notification-reports",
    systemHealth: "/system-health",
  },
} as const;

export type AdminRoute =
  | (typeof ADMIN_ROUTES)["overview"]
  | (typeof ADMIN_ROUTES)["studio"][keyof (typeof ADMIN_ROUTES)["studio"]]
  | (typeof ADMIN_ROUTES)["store"][keyof (typeof ADMIN_ROUTES)["store"]]
  | (typeof ADMIN_ROUTES)["operations"][keyof (typeof ADMIN_ROUTES)["operations"]]
  | (typeof ADMIN_ROUTES)["staff"][keyof (typeof ADMIN_ROUTES)["staff"]]
  | (typeof ADMIN_ROUTES)["updates"][keyof (typeof ADMIN_ROUTES)["updates"]]
  | (typeof ADMIN_ROUTES)["system"][keyof (typeof ADMIN_ROUTES)["system"]];
