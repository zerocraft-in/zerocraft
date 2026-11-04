import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./fonts.css";
import "./globals.css";
import "./index.css";
import SiteLayout from "@/app/site-layout";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { studio } from "@/lib/studio-config";

export const metadata: Metadata = {
  metadataBase: new URL(studio.url),
  title: {
    default: "Zerocraft Studio — Creative & Digital Studio",
    template: "%s | Zerocraft Studio",
  },
  description:
    "Zerocraft Studio builds distinctive brands, meaningful digital experiences, and compelling visual stories.",
};

export default function PortfolioRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body id="zerocraft-app" className="font-primary antialiased">
        <ThemeProvider>
          <SiteLayout>{children}</SiteLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}

