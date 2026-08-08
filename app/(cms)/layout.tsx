"use client";
import "./globals.css";
import React from "react";
import { JetBrains_Mono, Inter } from "next/font/google";
import { Providers } from "@/components/providers/provider";
import { cn } from "@/lib/utils";
const inter = Inter({
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
export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>
    <div id="zerocraft-cms" className={cn(inter.variable, jetbrainsMono.variable, "font-sans")}>
      {children}
    </div>
  </Providers>;
}
