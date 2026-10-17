import "@/styles/index.css";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import CartDrawer from "@/components/store/CartDrawer";
import SearchModal from "@/components/store/SearchModal";
import QuickViewModal from "@/components/store/QuickViewModal";
import { ThemeProvider } from "@/components/providers/theme-provider";
import SmoothScroll from "@/components/providers/SmoothScroll";
import { Toaster } from "sonner";
import type { Metadata } from "next";
import { domainOrigin } from "@/lib/domains";
import CraftPatternBackground from "@/components/store/CraftPatternBackground";

export const metadata: Metadata = {
  metadataBase: new URL(domainOrigin("store")),
  alternates: { canonical: domainOrigin("store") },
  title: "Zerocraft Store",
  description: "Browse the Zerocraft Store catalog.",
  robots: { index: true, follow: true },
};

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <SmoothScroll>
        <CraftPatternBackground>
        <div id="zerocraft-store" className="craft-pattern-surface min-h-screen flex flex-col bg-[#f6f2eb] text-[#151311] font-primary">
          <StoreHeader />
          <main className="flex-1 pt-20">
            {children}
          </main>
          <CartDrawer />
          <SearchModal />
          <QuickViewModal />
          <StoreFooter />
          <Toaster position="bottom-right" richColors />
        </div>
        </CraftPatternBackground>
      </SmoothScroll>
    </ThemeProvider>
  );
}
