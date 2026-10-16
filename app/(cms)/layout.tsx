import "./globals.css";
import { StudioAppearance } from "@/components/studio/appearance";
import React from "react";
import type { Metadata } from "next";
import { Providers } from "@/components/providers/provider";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div
        id="zerocraft-cms"
        className="
          min-h-svh bg-background font-sans text-foreground
          [--background:#fafafa] [--foreground:#09090b]
          [--card:#ffffff] [--card-foreground:#09090b]
          [--popover:#ffffff] [--popover-foreground:#09090b]
          [--primary:#18181b] [--primary-foreground:#fafafa]
          [--secondary:#f4f4f5] [--secondary-foreground:#18181b]
          [--muted:#f4f4f5] [--muted-foreground:#71717a]
          [--accent:#f4f4f5] [--accent-foreground:#18181b]
          [--destructive:#dc2626] [--border:#e4e4e7] [--input:#e4e4e7] [--ring:#a1a1aa]
          [--sidebar:#fafafa] [--sidebar-foreground:#09090b]
          [--sidebar-primary:#18181b] [--sidebar-primary-foreground:#fafafa]
          [--sidebar-accent:#f4f4f5] [--sidebar-accent-foreground:#18181b]
          [--sidebar-border:#e4e4e7] [--sidebar-ring:#a1a1aa]
          dark:[--background:#09090b] dark:[--foreground:#fafafa]
          dark:[--card:#18181b] dark:[--card-foreground:#fafafa]
          dark:[--popover:#18181b] dark:[--popover-foreground:#fafafa]
          dark:[--primary:#fafafa] dark:[--primary-foreground:#18181b]
          dark:[--secondary:#27272a] dark:[--secondary-foreground:#fafafa]
          dark:[--muted:#27272a] dark:[--muted-foreground:#a1a1aa]
          dark:[--accent:#27272a] dark:[--accent-foreground:#fafafa]
          dark:[--destructive:#ef4444] dark:[--border:#27272a] dark:[--input:#27272a] dark:[--ring:#71717a]
          dark:[--sidebar:#18181b] dark:[--sidebar-foreground:#fafafa]
          dark:[--sidebar-primary:#fafafa] dark:[--sidebar-primary-foreground:#18181b]
          dark:[--sidebar-accent:#27272a] dark:[--sidebar-accent-foreground:#fafafa]
          dark:[--sidebar-border:#27272a] dark:[--sidebar-ring:#71717a]
        "
      >
        <StudioAppearance>
          {children}
          <div id="studio-portals" />
        </StudioAppearance>
      </div>
    </Providers>
  );
}
