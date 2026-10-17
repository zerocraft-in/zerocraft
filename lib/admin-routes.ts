export const ADMIN_ROUTES = {
  overview: "/studio",
  studio: {
    works: "/studio/works",
    clients: "/studio/clients",
    appointments: "/studio/appointments",
    blogs: "/studio/blogs",
    reviews: "/studio/reviews",
  },
  store: {
    overview: "/studio/store",
    products: "/studio/store/products",
    categories: "/studio/store/categories",
    collections: "/studio/store/collections",
    inventory: "/studio/store/inventory",
    customization: "/studio/store/customization",
    discounts: "/studio/store/discounts",
    giftCards: "/studio/store/gift-cards",
    purchaseOrders: "/studio/store/purchase-orders",
    transfers: "/studio/store/transfers",
  },
  operations: {
    orders: "/studio/orders",
    reports: "/studio/reports",
  },
  system: {
    database: "/studio/database",
    staff: "/studio/staff",
    ai: "/studio/ai",
    automations: "/studio/automations",
    integrations: "/studio/settings#integrations",
    settings: "/studio/settings",
  },
} as const;

export type AdminRoute =
  | (typeof ADMIN_ROUTES)["overview"]
  | (typeof ADMIN_ROUTES)["studio"][keyof (typeof ADMIN_ROUTES)["studio"]]
  | (typeof ADMIN_ROUTES)["store"][keyof (typeof ADMIN_ROUTES)["store"]]
  | (typeof ADMIN_ROUTES)["operations"][keyof (typeof ADMIN_ROUTES)["operations"]]
  | (typeof ADMIN_ROUTES)["system"][keyof (typeof ADMIN_ROUTES)["system"]];
