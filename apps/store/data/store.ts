export const slides: [number, string][] = [
  [8, "Rain on the window, filter coffee and a first-day-first-show kind of morning."],
  [11, "Sea breeze, tea stalls and a story that stays with you long after the credits."],
  [10, "Neon, whistles and a midnight show you will never forget."],
  [12, "Moonlit streets, old songs and a city that never sleeps."],
  [14, "The only dialogue you need for opening day."],
];
export const bundles: { name: string; items: number[] }[] = [
  { name: "Fan Pack", items: [0, 14] },
  { name: "Mallu Mode Pack", items: [1, 13] },
  { name: "Frame It Pack", items: [10, 15] },
];
export const BUNDLE_DISCOUNT = 0.15;
export const FREE_SHIPPING_ABOVE = 999;
export const COUPON = { code: "FIRSTSHOW10", percent: 10 };
