export const ADMIN_ROUTES = {
  overview: "/",
  studio: {
    overview: "/studio",
    works: "/works",
    clients: "/clients",
    appointments: "/appointments",
    blogs: "/blogs",
  },
  store: {
    overview: "/store",
    products: "/store/products",
    categories: "/store/categories",
    inventory: "/store/inventory",
    customization: "/store/customization",
    channels: "/channels",
  },
  operations: {
    orders: "/orders",
    reports: "/reports",
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
    settings: "/settings",
    devices: "/devices",
    integrations: "/integrations",
    auditLogs: "/audit-logs",
    emailEvents: "/email-events",
    automations: "/automations",
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
