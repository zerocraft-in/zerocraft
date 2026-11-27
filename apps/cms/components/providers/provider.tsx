"use client";

import { CurrencyProvider } from "@/lib/currency-context";
import { Toaster } from "@zerocraft/components/ui/toast";
interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <CurrencyProvider>
      {children}
      <Toaster />
    </CurrencyProvider>
  );
}
