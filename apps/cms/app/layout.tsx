import "@fontsource-variable/hanken-grotesk/wght.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./globals.css";
import { StudioAppearance } from "@/components/studio/appearance";
import React from "react";
import type { Metadata } from "next";
import { Providers } from "@/components/providers/provider";
import { CmsFrame } from "./cms-frame";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-w-80 bg-background font-sans text-foreground">
        <Providers>
          <div
            id="zerocraft-cms"
            className="min-h-svh bg-background font-sans text-foreground"
            data-appearance="system"
            data-theme="light"
          >
            <StudioAppearance>
              <CmsFrame>{children}</CmsFrame>
              <div id="studio-portals" />
            </StudioAppearance>
          </div>
        </Providers>
      </body>
    </html>
  );
}
