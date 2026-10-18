"use client";

export type StoreEventName =
  | "view_item_list"
  | "select_item"
  | "view_item"
  | "search"
  | "filter_apply"
  | "add_to_cart"
  | "begin_checkout"
  | "newsletter_signup"
  | "social_click";

export function trackStoreEvent(name: StoreEventName, properties: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const detail = { name, properties, timestamp: new Date().toISOString() };
  window.dispatchEvent(new CustomEvent("zerocraft:store-event", { detail }));
  const dataLayer = (window as Window & { dataLayer?: Array<Record<string, unknown>> }).dataLayer;
  dataLayer?.push({ event: `store_${name}`, ...properties });
}
