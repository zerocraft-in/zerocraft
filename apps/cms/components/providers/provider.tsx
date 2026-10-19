"use client";

import { AuthProvider } from "@/components/providers/auth-provider";
import { CurrencyProvider } from "@/lib/currency-context";
import { Toaster } from "sonner";
interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <CurrencyProvider>
        {children}
        <Toaster position="bottom-right" theme="dark" />
      </CurrencyProvider>
    </AuthProvider>
  );
}
