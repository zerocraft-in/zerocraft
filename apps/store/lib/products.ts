export type Cat = 'tees' | 'hoodies' | 'posters' | 'frames' | 'accessories' | 'bundles';

export type Art =
  | { kind: 'tee' | 'hood' | 'tote'; bg: string; tc: string; p: string; q: string }
  | { kind: 'poster' | 'frame'; poster: 1 | 2 | 3; bg: string }
  | { kind: 'pack'; left: 'tee' | 'frame'; poster: 1 | 2 | 3; bg: string; tc: string; p: string; q: string };

export type Product = {
  slug: string;
  name: string;
  cat: Cat;
  lang: 'Tamil' | 'Malayalam' | 'Tamil + Malayalam';
  price: number;
  mrp: number;
  rating: number;
  reviews: number;
  badge?: string;
  sizes: string[];
  blurb: string;
  details: string[];
  art: Art;
};

export const CATS: { key: Cat | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'tees', label: 'Tees' },
  { key: 'hoodies', label: 'Hoodies' },
  { key: 'posters', label: 'Posters' },
  { key: 'frames', label: 'Frames' },
  { key: 'accessories', label: 'Accessories' },
  { key: 'bundles', label: 'Fan packs' },
];

const TEE = ['S', 'M', 'L', 'XL', 'XXL'];
const HOOD = ['M', 'L', 'XL', 'XXL'];
const POSTER = ['A4', 'A3', 'A2'];
const ONE = ['One size'];

const teeDetails = ['240 GSM combed cotton, boxy fit', 'Studio screen print, holds colour after 30 washes', 'Pre-shrunk, machine washable', 'Printed and packed in India'];
const posterDetails = ['300 GSM matte art paper', 'Fade-resistant pigment inks', 'Ships rolled in a protective tube', 'Frame sold separately'];

export const products: Product[] = [
  { slug: 'adipoli-mode-tee', name: 'Adipoli Mode Tee', cat: 'tees', lang: 'Malayalam', price: 999, mrp: 1299, rating: 4.9, reviews: 541, badge: 'NEW', sizes: TEE, blurb: 'Malayalam typography with a rising-sun print. Our most re-ordered tee.', details: teeDetails, art: { kind: 'tee', bg: '#EFB033', tc: '#1C1411', p: '#C23B22', q: '#F0E2C3' } },
  { slug: 'interval-break-tee', name: 'Interval Break Tee', cat: 'tees', lang: 'Tamil', price: 899, mrp: 1199, rating: 4.8, reviews: 310, badge: '-25%', sizes: TEE, blurb: 'For the ten minutes between the second and third act. Tamil lettering on the chest.', details: teeDetails, art: { kind: 'tee', bg: '#C23B22', tc: '#F0E2C3', p: '#1C1411', q: '#EFB033' } },
  { slug: 'mazha-zerocraft-tee', name: 'Mazha ZeroCraft Tee', cat: 'tees', lang: 'Malayalam', price: 1199, mrp: 1699, rating: 4.9, reviews: 428, badge: '-30%', sizes: TEE, blurb: 'Monsoon palette, sunset print and a temple skyline across the back.', details: teeDetails, art: { kind: 'tee', bg: '#F6D58E', tc: '#1F5F66', p: '#C23B22', q: '#F0E2C3' } },
  { slug: 'midnight-show-hoodie', name: 'Midnight Show Hoodie', cat: 'hoodies', lang: 'Tamil', price: 1499, mrp: 1999, rating: 4.9, reviews: 102, badge: 'NEW', sizes: HOOD, blurb: 'Heavyweight fleece in washed black with a moon and sunrise print.', details: ['380 GSM brushed fleece', 'Double-layer hood, kangaroo pocket', 'Studio screen print', 'Unisex oversized fit'], art: { kind: 'hood', bg: '#1C1411', tc: '#3A2F29', p: '#EFB033', q: '#F0E2C3' } },
  { slug: 'kerala-backwaters-hoodie', name: 'Kerala Backwaters Hoodie', cat: 'hoodies', lang: 'Malayalam', price: 1599, mrp: 1999, rating: 4.9, reviews: 188, sizes: HOOD, blurb: 'Teal fleece with a houseboat sunset on the chest.', details: ['380 GSM brushed fleece', 'Double-layer hood, kangaroo pocket', 'Studio screen print', 'Unisex oversized fit'], art: { kind: 'hood', bg: '#F0E2C3', tc: '#1F5F66', p: '#EFB033', q: '#F0E2C3' } },
  { slug: 'chaya-kada-poster', name: 'Chaya Kada Poster', cat: 'posters', lang: 'Tamil + Malayalam', price: 299, mrp: 399, rating: 4.8, reviews: 320, badge: 'BESTSELLER', sizes: POSTER, blurb: 'The only dialogue you need for opening day. A sunrise over the tea-stall skyline.', details: posterDetails, art: { kind: 'poster', poster: 1, bg: '#1F5F66' } },
  { slug: 'midnight-show-poster', name: 'Midnight Show Poster', cat: 'posters', lang: 'Tamil', price: 349, mrp: 449, rating: 4.8, reviews: 214, sizes: POSTER, blurb: 'A matinee-special moon over retro stripes.', details: posterDetails, art: { kind: 'poster', poster: 2, bg: '#EFB033' } },
  { slug: 'kuthu-night-poster', name: 'Kuthu Night Poster', cat: 'posters', lang: 'Tamil', price: 299, mrp: 399, rating: 4.7, reviews: 176, badge: 'NEW', sizes: POSTER, blurb: 'First day first show energy: sunburst, shades and a swagger.', details: posterDetails, art: { kind: 'poster', poster: 3, bg: '#F0E2C3' } },
  { slug: 'marina-beach-frame', name: 'Marina Beach Frame', cat: 'frames', lang: 'Tamil', price: 799, mrp: 999, rating: 4.7, reviews: 210, sizes: ['A4', 'A3'], blurb: 'Matte black frame with a Marina sunrise print, ready to hang.', details: ['Solid wood frame, matte finish', 'Acrylic front, not glass', 'Hanging kit included', 'Print on 300 GSM art paper'], art: { kind: 'frame', poster: 2, bg: '#EFB033' } },
  { slug: 'first-show-tote-bag', name: 'First Show Tote Bag', cat: 'accessories', lang: 'Tamil + Malayalam', price: 499, mrp: 699, rating: 4.7, reviews: 210, sizes: ONE, blurb: 'Heavy canvas tote with an inner pocket, sized for a poster tube and a tee.', details: ['12 oz natural canvas', 'Inner zip pocket', 'Reinforced handles', 'Screen printed'], art: { kind: 'tote', bg: '#DCC9A0', tc: '#1C1411', p: '#C23B22', q: '#F0E2C3' } },
  { slug: 'fan-pack', name: 'Fan Pack', cat: 'bundles', lang: 'Tamil', price: 1528, mrp: 1798, rating: 4.9, reviews: 96, badge: 'SAVE 15%', sizes: TEE, blurb: 'Vera Level tee plus the First Day First Show poster. Size applies to the tee.', details: ['1 tee + 1 A3 poster', 'Ships together', 'Same 7-day exchange policy'], art: { kind: 'pack', left: 'tee', poster: 3, bg: '#1C1411', tc: '#EFB033', p: '#C23B22', q: '#F0E2C3' } },
  { slug: 'mallu-mode-pack', name: 'Mallu Mode Pack', cat: 'bundles', lang: 'Malayalam', price: 1528, mrp: 1798, rating: 4.9, reviews: 88, badge: 'SAVE 15%', sizes: TEE, blurb: 'Adipoli Mode tee plus the Chaya Kada poster. Size applies to the tee.', details: ['1 tee + 1 A3 poster', 'Ships together', 'Same 7-day exchange policy'], art: { kind: 'pack', left: 'tee', poster: 1, bg: '#C23B22', tc: '#EFB033', p: '#1C1411', q: '#F0E2C3' } },
  { slug: 'frame-it-pack', name: 'Frame It Pack', cat: 'bundles', lang: 'Tamil', price: 2038, mrp: 2398, rating: 4.8, reviews: 54, badge: 'SAVE 15%', sizes: ['A4', 'A3'], blurb: 'Midnight Kuthu poster with a matinee minimal frame, ready to hang.', details: ['1 framed A3 print', 'Hanging kit included', 'Ships together'], art: { kind: 'pack', left: 'frame', poster: 3, bg: '#1F5F66', tc: '#EFB033', p: '#C23B22', q: '#F0E2C3' } },
];

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);
export const pct = (p: Product) => Math.round((1 - p.price / p.mrp) * 100);
export const inr = (n: number) => '₹' + n.toLocaleString('en-IN');
export const FREE_SHIP = 999;
export const SHIP_FEE = 79;
export const COUPON = 'FIRSTSHOW10';
