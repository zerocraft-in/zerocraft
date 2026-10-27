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

// The CMS is an authenticated dashboard. Its pages read browser/session state
// and load Supabase data after sign-in, so they must never be prerendered during
// the production build (which otherwise fails on dashboard routes such as
// /appointments).
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
              <React.Suspense
                fallback={
                  <div className="min-h-svh bg-background" aria-hidden="true" />
                }
              >
                <CmsFrame>{children}</CmsFrame>
              </React.Suspense>
              <div id="studio-portals" />
            </StudioAppearance>
          </div>
        </Providers>
      </body>
    </html>
  );
}
