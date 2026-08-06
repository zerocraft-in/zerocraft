"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CurrencyCode, CurrencyConfig, CURRENCIES, formatCurrency } from "./currency";

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  formatAmount: (amountInUSD: number) => string;
  activeConfig: CurrencyConfig;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "USD",
  setCurrency: () => {},
  formatAmount: (usd: number) => `$${usd.toLocaleString()}`,
  activeConfig: CURRENCIES.USD,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");

  useEffect(() => {
    const saved = localStorage.getItem("zerocraft_selected_currency") as CurrencyCode;
    if (saved && CURRENCIES[saved]) {
      setCurrencyState(saved);
    }
  }, []);

  const setCurrency = (code: CurrencyCode) => {
    if (CURRENCIES[code]) {
      setCurrencyState(code);
      localStorage.setItem("zerocraft_selected_currency", code);
    }
  };

  const formatAmount = (amountInUSD: number) => {
    return formatCurrency(amountInUSD, currency);
  };

  const activeConfig = CURRENCIES[currency] || CURRENCIES.USD;

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatAmount, activeConfig }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
