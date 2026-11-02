export const ADMIN_ROUTES = {
  overview: "/store",
  store: {
    overview: "/store",
    products: "/store/products",
    customers: "/store/customers",
    content: "/store/content",
    metaobjects: "/store/content/metaobjects",
    files: "/store/content/files",
    menus: "/store/content/menus",
    articles: "/store/content/articles",
    analytics: "/analytics",
    categories: "/store/categories",
    recycleBin: "/store/bin",
    media: "/media",
    mediaLibrary: "/media/library",
    inventory: "/store/inventory",
    channels: "/point-of-sales",
  },
  operations: {
    orders: "/store/orders",
    orderDrafts: "/store/orders/drafts",
    abandonedCheckouts: "/store/orders/abandoned-checkouts",
    purchaseOrders: "/store/orders/purchase-orders",
    reports: "/reports",
    analytics: "/analytics",
    reportLibrary: "/reports/library",
    liveView: "/analytics/live-view",
    searchConsole: "/system/search-console",
    transactions: "/transactions",
    subscriptions: "/subscriptions",
    disputes: "/disputes",
  },
  staff: {
    scheduling: "/scheduling",
    timeTracking: "/time-tracking",
  },
  settings: {
    overview: "/settings",
    users: "/settings/users",
    userRoles: "/settings/users/roles",
    userSecurity: "/settings/users/security",
  },
  updates: {
    whatsNew: "/whats-new",
  },
  system: {
    overview: "/system",
    settings: "/settings",
    devices: "/devices",
    integrations: "/settings/integrations",
    auditLogs: "/system/audit-logs",
    emailEvents: "/email-events",
    automations: "/system/automations",
    approvals: "/system/automations/approvals",
    notifications: "/notifications",
    notificationReports: "/notification-reports",
    systemHealth: "/system/health",
  },
} as const;

export type AdminRoute =
  | (typeof ADMIN_ROUTES)["overview"]
  | (typeof ADMIN_ROUTES)["store"][keyof (typeof ADMIN_ROUTES)["store"]]
  | (typeof ADMIN_ROUTES)["operations"][keyof (typeof ADMIN_ROUTES)["operations"]]
  | (typeof ADMIN_ROUTES)["staff"][keyof (typeof ADMIN_ROUTES)["staff"]]
  | (typeof ADMIN_ROUTES)["settings"][keyof (typeof ADMIN_ROUTES)["settings"]]
  | (typeof ADMIN_ROUTES)["updates"][keyof (typeof ADMIN_ROUTES)["updates"]]
  | (typeof ADMIN_ROUTES)["system"][keyof (typeof ADMIN_ROUTES)["system"]];
