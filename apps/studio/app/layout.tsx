import type { Metadata } from "next";
import { studio, studioSocials } from "@/lib/studio-config";
import { domainOrigin } from "@/lib/domains";
import { cn } from "@/lib/utils";
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "@fontsource/inter/900.css";
import "./fonts.css";
import "./index.css";
import SiteLayout from "./site-layout";
import { ThemeProvider } from "@/components/providers/theme-provider";

export const metadata: Metadata = {
  metadataBase: new URL(domainOrigin("studio")),
  title: {
    default: "Zerocraft Studio — Creative & Digital Studio",
    template: "%s | Zerocraft Studio",
  },
  description: studio.description,
  authors: [{ name: "Zerocraft Studio", url: studio.url }],
  creator: "Zerocraft Studio",
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${studio.url}/#organization`,
  name: "Zerocraft Studio",
  url: studio.url,
  logo: `${studio.url}/icon.svg`,
  image: `${studio.url}/og-image.jpg`,
  description: studio.description,
  email: studio.email,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Tenkasi",
    addressRegion: "Tamil Nadu",
    addressCountry: "IN",
  },
  sameAs: studioSocials.map((link) => link.url),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("scroll-smooth")}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      </head>
      <body id="zerocraft-app" className="font-primary antialiased">
        <ThemeProvider>
          <SiteLayout>{children}</SiteLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
