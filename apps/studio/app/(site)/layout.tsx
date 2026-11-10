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
import { getPublicAppearance } from "@/lib/public-appearance";
import { GOOGLE_FONTS_URL, getFontFamilyStack } from "@/lib/studio-appearance";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const appearance = await getPublicAppearance();
  return {
    metadataBase: new URL(studio.url),
    title: { default: `${appearance.name} — Creative & Digital Studio`, template: `%s | ${appearance.name}` },
    description: `${appearance.name} builds distinctive brands, meaningful digital experiences, and compelling visual stories.`,
    icons: appearance.faviconUrl ? { icon: appearance.faviconUrl, shortcut: appearance.faviconUrl } : undefined,
  };
}

export default function PortfolioRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const appearancePromise = getPublicAppearance();
  return (
    <AppearanceRoot appearancePromise={appearancePromise}>
      {children}
    </AppearanceRoot>
  );
}

async function AppearanceRoot({
  children,
  appearancePromise,
}: {
  children: React.ReactNode;
  appearancePromise: ReturnType<typeof getPublicAppearance>;
}) {
  const appearance = await appearancePromise;
  const fontStack = getFontFamilyStack(appearance.fontFamily);
  const style = {
    "--zc-accent": appearance.accentColor,
    "--zc-accent-hover": appearance.accentColor,
    "--font-primary": fontStack,
    fontFamily: fontStack,
  } as React.CSSProperties;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
      </head>
      <body id="zerocraft-app" className="font-primary antialiased" style={style} data-site-theme={appearance.themeMode}>
        <ThemeProvider defaultTheme={appearance.themeMode} enableSystem>
          <SiteLayout appearance={appearance}>{children}</SiteLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}

