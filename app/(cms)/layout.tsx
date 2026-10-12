import "./globals.css";
import React from "react";
import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import { Providers } from "@/components/providers/provider";
import { cn } from "@/lib/utils";
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>
    <div id="zerocraft-cms" className={cn(manrope.variable, jetbrainsMono.variable, "font-sans")}>
      {children}
    </div>
  </Providers>;
}
