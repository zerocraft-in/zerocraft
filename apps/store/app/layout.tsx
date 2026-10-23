import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { StoreProvider } from "@/lib/store";
import SvgDefs from "@/components/sections/SvgDefs";
import TopTicker from "@/components/sections/TopTicker";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBar from "@/components/sections/MobileBar";
import CartDrawer from "@/components/sections/CartDrawer";
import QuickView from "@/components/sections/QuickView";
import Toast from "@/components/sections/Toast";
import RevealInit from "@/components/sections/RevealInit";
import { getProducts } from "@/lib/commerce/catalog";
import { catalogProductsToStoreProducts } from "@/lib/commerce/storefront-product";

const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  alternates: { canonical: "/" },
  title: {
    default: "Zerocraft Store | Creative merchandise and artwork",
    template: "%s | Zerocraft Store",
  },
  description:
    "Creative merchandise, posters, apparel and digital artwork from Zerocraft Studio, including Tamil and Malayalam drops.",
  openGraph: {
    title: "Zerocraft Store",
    description: "Creative merchandise, posters, apparel and digital artwork from Zerocraft Studio",
    type: "website",
    url: site,
    images: [{ url: "/og-image.jpg", alt: "Zerocraft Store creative merchandise" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zerocraft Store",
    description: "Creative merchandise, posters, apparel and digital artwork from Zerocraft Studio",
    images: ["/og-image.jpg"],
  },
  icons: { icon: "/logo.svg", apple: "/logo.svg" },
};
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#0E0B09",
};

const FONTS =
  "https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;600;700;800&family=Space+Mono:wght@400;700&family=Noto+Sans+Tamil:wght@600;800&family=Noto+Sans+Malayalam:wght@600;800&display=swap";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const first = await getProducts({ page: 1, pageSize: 48 });
  const second =
    first.total > 48
      ? await getProducts({ page: 2, pageSize: 48 })
      : { products: [] };
  const catalog = catalogProductsToStoreProducts([
    ...first.products,
    ...second.products,
  ]);
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link href={FONTS} rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("padam-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
        <noscript>
          <style>{`.reveal-on-scroll{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body>
        <SvgDefs />
        <StoreProvider catalog={catalog}>
          <TopTicker />
          <Header />
          <main>{children}</main>
          <Footer />
          <MobileBar />
          <CartDrawer />
          <QuickView />
          <Toast />
          <RevealInit />
        </StoreProvider>
      </body>
    </html>
  );
}
