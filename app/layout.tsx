import type { Metadata } from "next";
import { studio, studioSocials } from "@/lib/studio-config";
import { Manrope, JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-primary",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(studio.url),
  title: {
    default: "Zerocraft Studio — Creative & Digital Studio",
    template: "%s | Zerocraft Studio",
  },
  description: studio.description,
  authors: [{ name: "Zerocraft Studio", url: studio.url }],
  creator: "Zerocraft Studio",
  robots: { index: true, follow: true },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${studio.url}/#organization`,
  name: "Zerocraft Studio",
  url: studio.url,
  logo: `${studio.url}/favicon.ico`,
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
      className={cn(manrope.variable, jetbrainsMono.variable, "scroll-smooth")}
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
        {children}
      </body>
    </html>
  );
}
