"use client";

import { ThemeProvider } from "next-themes";

import { AuthProvider } from "@/components/providers/auth-provider";
import { CurrencyProvider } from "@/lib/currency-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";
interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <CurrencyProvider>
          <TooltipProvider>
            {children}

            <Toaster />
          </TooltipProvider>
        </CurrencyProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
