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
    inventory: "/store/inventory",
    customization: "/store/customization",
  },
  operations: {
    orders: "/orders",
    reports: "/reports",
  },
  system: {
    settings: "/settings",
  },
} as const;

export type AdminRoute =
  | (typeof ADMIN_ROUTES)["overview"]
  | (typeof ADMIN_ROUTES)["studio"][keyof (typeof ADMIN_ROUTES)["studio"]]
  | (typeof ADMIN_ROUTES)["store"][keyof (typeof ADMIN_ROUTES)["store"]]
  | (typeof ADMIN_ROUTES)["operations"][keyof (typeof ADMIN_ROUTES)["operations"]]
  | (typeof ADMIN_ROUTES)["system"][keyof (typeof ADMIN_ROUTES)["system"]];
