export const ADMIN_ROUTES = {
  overview: "/",
  studio: {
    works: "/works",
    clients: "/clients",
    appointments: "/appointments",
    blogs: "/blogs",
  },
  store: {
    overview: "/store",
    products: "/store/products",
    categories: "/store/categories",
    collections: "/store/collections",
    inventory: "/store/inventory",
    purchaseOrders: "/store/purchase-orders",
    transfers: "/store/transfers",
    discounts: "/store/discounts",
    giftCards: "/store/gift-cards",
    customization: "/store/customization",
  },
  operations: {
    orders: "/orders",
    reports: "/reports",
  },
  system: {
    settings: "/settings",
    staff: "/staff",
  },
} as const;

export type AdminRoute =
  | (typeof ADMIN_ROUTES)["overview"]
  | (typeof ADMIN_ROUTES)["studio"][keyof (typeof ADMIN_ROUTES)["studio"]]
  | (typeof ADMIN_ROUTES)["store"][keyof (typeof ADMIN_ROUTES)["store"]]
  | (typeof ADMIN_ROUTES)["operations"][keyof (typeof ADMIN_ROUTES)["operations"]]
  | (typeof ADMIN_ROUTES)["system"][keyof (typeof ADMIN_ROUTES)["system"]];
