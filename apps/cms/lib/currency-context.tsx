"use client";

import { createContext, useContext, type ReactNode } from "react";
import { CURRENCIES, formatCurrency, STORE_CURRENCY, type CurrencyCode } from "./currency";

const CurrencyContext = createContext<CurrencyCode>(STORE_CURRENCY);

export function CurrencyProvider({ children, currency = STORE_CURRENCY }: { children: ReactNode; currency?: CurrencyCode }) {
  return <CurrencyContext.Provider value={currency}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const currency = useContext(CurrencyContext);
  return { currency, activeConfig: CURRENCIES[currency], formatAmount: (amount: number) => formatCurrency(amount, currency) };
}
