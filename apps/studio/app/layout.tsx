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
  alternates: { canonical: "/" },
  title: {
    default: "Zerocraft Studio — Creative & Digital Studio",
    template: "%s | Zerocraft Studio",
  },
  description: studio.description,
  authors: [
    { name: "Manimaran", url: studio.url },
    { name: "Zerocraft Studio", url: studio.url },
  ],
  creator: "Manimaran",
  publisher: "Zerocraft Studio",
  category: "Design and Technology",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Zerocraft Studio — Creative & Digital Studio",
    description: studio.description,
    url: domainOrigin("studio"),
    siteName: "Zerocraft Studio",
    type: "website",
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "Zerocraft Studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zerocraft Studio — Creative & Digital Studio",
    description: studio.description,
    images: ["/android-chrome-512x512.png"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${studio.url}/#organization`,
  name: "Zerocraft Studio",
  url: studio.url,
  logo: `${studio.url}/icon.svg`,
  image: `${studio.url}/android-chrome-512x512.png`,
  description: studio.description,
  email: studio.email,
  telephone: `+${studio.whatsapp.number}`,
  priceRange: "$$$",
  areaServed: [
    { "@type": "Country", name: "India" },
    { "@type": "Place", name: "Tamil Nadu" },
  ],
  serviceType: [
    "Brand strategy",
    "Visual identity",
    "Digital design",
    "Web development",
    "Photography and film",
    "Motion design",
  ],
  founder: {
    "@type": "Person",
    "@id": `${studio.url}/#manimaran`,
    name: "Manimaran",
    jobTitle: "Founder & Creative Lead",
    worksFor: { "@id": `${studio.url}/#organization` },
  },
  address: {
    "@type": "PostalAddress",
    streetAddress: studio.address.streetAddress,
    addressLocality: studio.address.addressLocality,
    postalCode: studio.address.postalCode,
    addressRegion: studio.address.addressRegion,
    addressCountry: studio.address.addressCountry,
    addressDistrict: studio.address.district,
  },
  sameAs: studioSocials.map((link) => link.url),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("scroll-smooth")}>
      <head>
        <meta
          name="google-site-verification"
          content="9nd1k2g6f9wABS8ydGlCCtZscr3ANpxLrmi8YVSkWDI"
        />
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
