import type { Metadata } from "next";
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
  metadataBase: new URL("https://zerocraft.in"),

  title: {
    default: "Zerocraft Studio | Creative Development Agency",
    template: "%s | Zerocraft Studio",
  },

  description:
    "Zerocraft Studio is an avant-garde creative development agency based in Tenkasi, India. We craft authentic, innovative, and scalable digital products — specializing in branding, high-performance web development, UI/UX design, digital marketing, cinematic video production, and bespoke print solutions.",

  keywords: [
    "Zerocraft Studio",
    "Zerocraft",
    "creative development agency",
    "digital agency Tenkasi",
    "digital studio Tenkasi",
    "branding agency Tamil Nadu",
    "web development agency India",
    "Next.js web development",
    "UI UX design studio",
    "digital marketing services",
    "video production agency",
    "commercial printing solutions",
    "Tenkasi creative agency",
  ],

  authors: [{ name: "Zerocraft Studio", url: "https://zerocraft.in" }],
  creator: "Zerocraft Studio",
  publisher: "Zerocraft Studio",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  alternates: {
    canonical: "https://zerocraft.in",
  },

  openGraph: {
    title: "Zerocraft Studio | Creative Development Agency",
    description:
      "Crafting ideas with design, code & story. We build digital experiences that connect, inspire, and evolve with your brand.",
    url: "https://zerocraft.in",
    siteName: "Zerocraft Studio",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Zerocraft Studio — Creative Development Agency (Tenkasi, India)",
      },
    ],
    locale: "en_IN",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Zerocraft Studio | Creative Development Agency",
    description:
      "Crafting ideas with design, code & story. We build digital experiences that connect, inspire, and evolve with your brand.",
    images: ["/og-image.jpg"],
    creator: "@studio.zerocraft",
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },

  category: "Digital Agency",

  other: {
    "geo.region": "IN-TN",
    "geo.placename": "Tenkasi, Tamil Nadu, India",
    "geo.position": "8.9594;77.3152",
    "ICBM": "8.9594, 77.3152",
    "theme-color": "#09090B",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ProfessionalService",
      "@id": "https://zerocraft.in/#organization",
      "name": "Zerocraft Studio",
      "legalName": "Zerocraft Studio",
      "url": "https://zerocraft.in",
      "logo": "https://zerocraft.in/favicon.ico",
      "image": "https://zerocraft.in/og-image.jpg",
      "description":
        "Creative development agency specializing in brand identity, web applications, UI/UX design, performance marketing, video production, and print solutions.",
      "email": "hello@zerocraft.in",
      "priceRange": "$$",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Tenkasi",
        "addressRegion": "Tamil Nadu",
        "addressCountry": "IN",
        "postalCode": "627811",
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 8.9594,
        "longitude": 77.3152,
      },
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ],
          "opens": "09:00",
          "closes": "19:00",
        },
      ],
      "sameAs": [
        "https://instagram.com/studio.zerocraft",
        "https://x.com/zerocraftstudio",
        "https://github.com/zerocraft-in",
        "https://linkedin.com/company/zerocraft",
      ],
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Creative Agency Services",
        "itemListElement": [
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Brand Identity & Strategy",
            },
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Full-Stack Web Development",
            },
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "UI/UX Design & Design Systems",
            },
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Digital Marketing & SEO",
            },
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Cinematic Video Production",
            },
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Bespoke Print & Packaging",
            },
          },
        ],
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://zerocraft.in/#website",
      "url": "https://zerocraft.in",
      "name": "Zerocraft Studio",
      "publisher": {
        "@id": "https://zerocraft.in/#organization",
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://zerocraft.in/store/search?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
  ],
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body id="zerocraft-app" className="font-primary antialiased">
        {children}
      </body>
    </html>
  );
}
