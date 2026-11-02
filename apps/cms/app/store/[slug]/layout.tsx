import { CurrencyProvider } from "@/lib/currency-context";
import { storeCurrency } from "@/lib/currency";
import type { ReactNode } from "react";
import { storePage } from "@/lib/platform/page-access";

/** Protect every tenant page, including deep links such as /products/new. */
export default async function StoreTenantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { store } = await storePage(slug);
  return <CurrencyProvider currency={storeCurrency(store.settings?.currency)}>{children}</CurrencyProvider>;
}
