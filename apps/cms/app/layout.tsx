import "@fontsource-variable/hanken-grotesk/wght.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./globals.css";
import React from "react";
import type { Metadata } from "next";
import { Providers } from "@/components/providers/provider";
import { CmsFrame } from "@/components/layout/cms-frame";

export const metadata: Metadata = {
  title: {
    default: "Store admin | Zerocraft",
    template: "%s | Store admin | Zerocraft",
  },
  description: "Authenticated Zerocraft ecommerce administration.",
  robots: { index: false, follow: false },
  referrer: "same-origin",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Authenticated Shopify-style ecommerce admin boundary. The public Commerce
 * dashboard remains a separate application; this app owns the store and its
 * operational settings workspace.
 */
export default function CmsEcommerceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-w-80 bg-primary font-sans text-foreground">
        <Providers>
          <div
            id="zerocraft-cms"
            className="min-h-svh bg-primary font-sans text-foreground"
            data-appearance="system"
            data-theme="light"
          >
            <CmsFrame>{children}</CmsFrame>
            <div id="studio-portals" />
          </div>
        </Providers>
      </body>
    </html>
  );
}
