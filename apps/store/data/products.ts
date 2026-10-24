export type Category = "Tees" | "Hoodies" | "Posters" | "Frames" | "Digital" | "Accessories";
export type Lang = "ta" | "ml";

export interface Product {
  id: number;
  backendId?: string;
  slug: string;
  n: string; // name
  c: Category;
  pr: number; // price
  o: number; // original price
  ty: "tee" | "hoodie" | "poster" | "frame" | "digi" | "stick" | "tote" | "mug";
  v: number; // art variant 0-5
  pal: number; // palette index (lib/art.ts)
  t: string; // poster title, "|" splits typography lines
  s: string; // native-script subtitle
  sub: string;
  bd: string; // badge
  r: number; // rating
  reviewCount?: number;
  l?: Lang;
  col?: string | number;
  bg?: string;
  ink?: string;
  ink2?: string;
  z?: string[]; // sizes / formats
}

// Replace this array with your CMS / database / API later.
export const products = [
 {
  "n": "Vera Level Tee",
  "c": "Tees",
  "pr": 999,
  "o": 1299,
  "ty": "tee",
  "v": 5,
  "pal": 0,
  "t": "VERA|LEVEL|MODE",
  "s": "",
  "sub": "Typography Tee",
  "bd": "Bestseller",
  "r": 4.8,
  "l": "ta",
  "col": "black",
  "bg": "#F2B705",
  "z": [
   "S",
   "M",
   "L",
   "XL",
   "XXL"
  ],
  "id": 0,
  "slug": "vera-level-tee"
 },
 {
  "n": "Adipoli Mode Tee",
  "c": "Tees",
  "pr": 999,
  "o": 1299,
  "ty": "tee",
  "v": 5,
  "pal": 1,
  "t": "ADIPOLI|MODE|ON",
  "s": "",
  "sub": "Typography Tee",
  "bd": "New",
  "r": 4.9,
  "l": "ml",
  "col": "mustard",
  "ink": "#120C0A",
  "ink2": "#B3121B",
  "bg": "#B3121B",
  "z": [
   "S",
   "M",
   "L",
   "XL",
   "XXL"
  ],
  "id": 1,
  "slug": "adipoli-mode-tee"
 },
 {
  "n": "Mass Matinee Tee",
  "c": "Tees",
  "pr": 1199,
  "o": 1499,
  "ty": "tee",
  "v": 0,
  "pal": 0,
  "t": "",
  "s": "",
  "sub": "Poster Graphic Tee",
  "bd": "",
  "r": 4.7,
  "l": "ta",
  "col": "red",
  "bg": "#EADFC6",
  "z": [
   "S",
   "M",
   "L",
   "XL",
   "XXL"
  ],
  "id": 2,
  "slug": "mass-matinee-tee"
 },
 {
  "n": "Mazha Padam Tee",
  "c": "Tees",
  "pr": 1199,
  "o": 1499,
  "ty": "tee",
  "v": 3,
  "pal": 2,
  "t": "",
  "s": "",
  "sub": "Poster Graphic Tee",
  "bd": "New",
  "r": 4.8,
  "l": "ml",
  "col": "black",
  "bg": "#B3121B",
  "z": [
   "S",
   "M",
   "L",
   "XL",
   "XXL"
  ],
  "id": 3,
  "slug": "mazha-padam-tee"
 },
 {
  "n": "Interval Break Tee",
  "c": "Tees",
  "pr": 899,
  "o": 1199,
  "ty": "tee",
  "v": 5,
  "pal": 5,
  "t": "INTER|VAL|BREAK",
  "s": "",
  "sub": "Typography Tee",
  "bd": "",
  "r": 4.6,
  "col": "bone",
  "ink": "#120C0A",
  "ink2": "#B3121B",
  "bg": "#141010",
  "z": [
   "S",
   "M",
   "L",
   "XL",
   "XXL"
  ],
  "id": 4,
  "slug": "interval-break-tee"
 },
 {
  "n": "Scene Cut Oversized Tee",
  "c": "Tees",
  "pr": 1299,
  "o": 1699,
  "ty": "tee",
  "v": 1,
  "pal": 3,
  "t": "",
  "s": "",
  "sub": "Oversized Tee",
  "bd": "Limited",
  "r": 4.7,
  "col": "charcoal",
  "bg": "#F2B705",
  "z": [
   "S",
   "M",
   "L",
   "XL",
   "XXL"
  ],
  "id": 5,
  "slug": "scene-cut-oversized-tee"
 },
 {
  "n": "Last Row Gang Hoodie",
  "c": "Hoodies",
  "pr": 2199,
  "o": 2799,
  "ty": "hoodie",
  "v": 5,
  "pal": 0,
  "t": "LAST|ROW|GANG",
  "s": "",
  "sub": "Typography Hoodie",
  "bd": "Limited",
  "r": 4.9,
  "col": "black",
  "bg": "#B3121B",
  "z": [
   "S",
   "M",
   "L",
   "XL",
   "XXL"
  ],
  "id": 6,
  "slug": "last-row-gang-hoodie"
 },
 {
  "n": "Midnight Show Hoodie",
  "c": "Hoodies",
  "pr": 2299,
  "o": 2899,
  "ty": "hoodie",
  "v": 1,
  "pal": 5,
  "t": "",
  "s": "",
  "sub": "Graphic Hoodie",
  "bd": "",
  "r": 4.8,
  "l": "ta",
  "col": "red",
  "bg": "#EADFC6",
  "z": [
   "S",
   "M",
   "L",
   "XL",
   "XXL"
  ],
  "id": 7,
  "slug": "midnight-show-hoodie"
 },
 {
  "n": "Kaalai Mazhai Poster",
  "c": "Posters",
  "pr": 899,
  "o": 1099,
  "ty": "poster",
  "v": 3,
  "pal": 2,
  "t": "Kaalai Mazhai",
  "s": "காலை மழை",
  "sub": "Film-style Poster",
  "bd": "New",
  "r": 4.8,
  "l": "ta",
  "z": [
   "A3",
   "A2",
   "18×24"
  ],
  "id": 8,
  "slug": "kaalai-mazhai-poster"
 },
 {
  "n": "Theru Kadhai Poster",
  "c": "Posters",
  "pr": 849,
  "o": 1049,
  "ty": "poster",
  "v": 2,
  "pal": 0,
  "t": "Theru Kadhai",
  "s": "தெரு கதை",
  "sub": "Film-style Poster",
  "bd": "",
  "r": 4.7,
  "l": "ta",
  "z": [
   "A3",
   "A2",
   "18×24"
  ],
  "id": 9,
  "slug": "theru-kadhai-poster"
 },
 {
  "n": "Midnight Kuthu Poster",
  "c": "Posters",
  "pr": 899,
  "o": 1099,
  "ty": "poster",
  "v": 1,
  "pal": 3,
  "t": "Midnight Kuthu",
  "s": "நள்ளிரவு குத்து",
  "sub": "Film-style Poster",
  "bd": "Bestseller",
  "r": 4.9,
  "l": "ta",
  "z": [
   "A3",
   "A2",
   "18×24"
  ],
  "id": 10,
  "slug": "midnight-kuthu-poster"
 },
 {
  "n": "Kadalora Kadha Poster",
  "c": "Posters",
  "pr": 899,
  "o": 1099,
  "ty": "poster",
  "v": 3,
  "pal": 4,
  "t": "Kadalora Kadha",
  "s": "കടലോര കഥ",
  "sub": "Film-style Poster",
  "bd": "New",
  "r": 4.8,
  "l": "ml",
  "z": [
   "A3",
   "A2",
   "18×24"
  ],
  "id": 11,
  "slug": "kadalora-kadha-poster"
 },
 {
  "n": "Nilavu Nagaram Poster",
  "c": "Posters",
  "pr": 849,
  "o": 1049,
  "ty": "poster",
  "v": 0,
  "pal": 3,
  "t": "Nilavu Nagaram",
  "s": "നിലാവ് നഗരം",
  "sub": "Film-style Poster",
  "bd": "",
  "r": 4.7,
  "l": "ml",
  "z": [
   "A3",
   "A2",
   "18×24"
  ],
  "id": 12,
  "slug": "nilavu-nagaram-poster"
 },
 {
  "n": "Chaya Kada Poster",
  "c": "Posters",
  "pr": 799,
  "o": 999,
  "ty": "poster",
  "v": 4,
  "pal": 1,
  "t": "Chaya Kada",
  "s": "ചായക്കട",
  "sub": "Film-style Poster",
  "bd": "",
  "r": 4.6,
  "l": "ml",
  "z": [
   "A3",
   "A2",
   "18×24"
  ],
  "id": 13,
  "slug": "chaya-kada-poster"
 },
 {
  "n": "First Day First Show Poster",
  "c": "Posters",
  "pr": 799,
  "o": 999,
  "ty": "poster",
  "v": 5,
  "pal": 0,
  "t": "FIRST DAY|FIRST|SHOW",
  "s": "",
  "sub": "Typography Poster",
  "bd": "Bestseller",
  "r": 4.8,
  "z": [
   "A3",
   "A2",
   "18×24"
  ],
  "id": 14,
  "slug": "first-day-first-show-poster"
 },
 {
  "n": "Matinee Minimal Frame",
  "c": "Frames",
  "pr": 1499,
  "o": 1799,
  "ty": "frame",
  "v": 2,
  "pal": 1,
  "t": "Theru Kadhai",
  "s": "தெரு கதை",
  "sub": "Minimal Frame",
  "bd": "",
  "r": 4.9,
  "z": [
   "A4",
   "A3"
  ],
  "id": 15,
  "slug": "matinee-minimal-frame"
 },
 {
  "n": "Collage Frame 4-up",
  "c": "Frames",
  "pr": 1899,
  "o": 2299,
  "ty": "frame",
  "v": 0,
  "pal": 0,
  "t": "",
  "s": "",
  "sub": "Collage Frame",
  "bd": "Limited",
  "r": 4.6,
  "col": 1,
  "z": [
   "A3 · 4 slots"
  ],
  "id": 16,
  "slug": "collage-frame-4-up"
 },
 {
  "n": "Neon Theru Wallpaper Pack",
  "c": "Digital",
  "pr": 249,
  "o": 349,
  "ty": "digi",
  "v": 1,
  "pal": 3,
  "t": "Neon Theru",
  "s": "நியான் தெரு",
  "sub": "Digital Download",
  "bd": "",
  "r": 4.8,
  "l": "ta",
  "id": 17,
  "slug": "neon-theru-wallpaper-pack"
 },
 {
  "n": "Malabar Nights Wallpaper Pack",
  "c": "Digital",
  "pr": 249,
  "o": 349,
  "ty": "digi",
  "v": 3,
  "pal": 2,
  "t": "Malabar Nights",
  "s": "മലബാർ രാത്രി",
  "sub": "Digital Download",
  "bd": "New",
  "r": 4.9,
  "l": "ml",
  "id": 18,
  "slug": "malabar-nights-wallpaper-pack"
 },
 {
  "n": "Typography Poster Template Pack",
  "c": "Digital",
  "pr": 349,
  "o": 499,
  "ty": "digi",
  "v": 5,
  "pal": 0,
  "t": "DIALOGUE|DROP",
  "s": "",
  "sub": "Typography Templates",
  "bd": "",
  "r": 4.7,
  "id": 19,
  "slug": "typography-poster-template-pack"
 },
 {
  "n": "Ticket Stub Sticker Pack",
  "c": "Accessories",
  "pr": 299,
  "o": 399,
  "ty": "stick",
  "v": 0,
  "pal": 0,
  "t": "",
  "s": "",
  "sub": "Stickers",
  "bd": "",
  "r": 4.7,
  "id": 20,
  "slug": "ticket-stub-sticker-pack"
 },
 {
  "n": "First Show Tote Bag",
  "c": "Accessories",
  "pr": 499,
  "o": 699,
  "ty": "tote",
  "v": 5,
  "pal": 0,
  "t": "FIRST|SHOW|ONLY",
  "s": "",
  "sub": "Typography Tote",
  "bd": "Bestseller",
  "r": 4.8,
  "id": 21,
  "slug": "first-show-tote-bag"
 }
] as unknown as Product[];

export const categories: Category[] = ["Tees", "Hoodies", "Posters", "Frames", "Digital", "Accessories"];
export const getProduct = (id: number) => products[id];
export const getBySlug = (slug: string) => products.find((p) => p.slug === slug);
