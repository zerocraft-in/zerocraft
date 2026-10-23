import type { Product } from "@/data/products";
import { BUNDLE_DISCOUNT } from "@/data/store";

export const R = (v: number) => "₹" + v.toLocaleString("en-IN");
export const LG: Record<string, string> = { ta: "Tamil", ml: "Malayalam" };
export const defaultSize = (p: Product) =>
  p.c === "Tees" || p.c === "Hoodies" ? "M" : (p.z?.[0] ?? "");
export const unitPrice = (pr: number, bundle?: boolean) =>
  Math.round(pr * (bundle ? 1 - BUNDLE_DISCOUNT : 1));
export const offPercent = (p: Product) => Math.round((1 - p.pr / p.o) * 100);
