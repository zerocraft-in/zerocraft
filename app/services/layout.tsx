

import type { Metadata } from "next";
import "@/styles/globals.css";
import Header from "./header";


export const metadata: Metadata = {
  metadataBase: new URL("https://zerocraft.in"),

  title: {
    default: "Zerocraft Studio | Creative Digital Agency",
    template: "%s | Zerocraft Studio",
  },

  description:
    "Zerocraft Studio is a full-service digital agency specializing in branding, web development, UI/UX design, digital marketing, video production, and high-quality printing solutions.",

  keywords: [
    "Zerocraft Studio",
    "digital agency India",
    "branding agency",
    "web development company",
    "UI UX design",
    "digital marketing services",
    "video production agency",
    "creative studio",
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
    title: "Zerocraft Studio | Creative Digital Agency",
    description:
      "Branding, Web Development, UI/UX, Digital Marketing, Video Production & Printing — all in one creative digital agency.",
    url: "https://zerocraft.in",
    siteName: "Zerocraft Studio",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Zerocraft Studio Digital Agency",
      },
    ],
    locale: "en_IN",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Zerocraft Studio | Creative Digital Agency",
    description:
      "A premium digital agency delivering branding, web, UI/UX, marketing, video & print solutions.",
    images: ["/og-image.jpg"],
    creator: "@zerocraftstudio", // optional
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },

  category: "Digital Agency",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main>

        {children}
      </main></>


  );
}
