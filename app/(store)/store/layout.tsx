import "@/styles/index.css";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import CartDrawer from "@/components/store/CartDrawer";
import SearchModal from "@/components/store/SearchModal";
import QuickViewModal from "@/components/store/QuickViewModal";
import { ThemeProvider } from "@/components/providers/theme-provider";
import SmoothScroll from "@/components/providers/SmoothScroll";
import { Toaster } from "sonner";

export const metadata = {
  title: "ZeroCraft Store | Crafted with Passion. Delivered with Care.",
  description: "Discover handcrafted posters, premium photo frames, personalized gifts, journals, and minimal desk accessories for every occasion at ZeroCraft Store.",
};

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <SmoothScroll>
        <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white transition-colors duration-500 font-primary">
          <StoreHeader />
          <main className="flex-1 pt-[80px]">
            {children}
          </main>
          <CartDrawer />
          <SearchModal />
          <QuickViewModal />
          <StoreFooter />
          <Toaster position="bottom-right" richColors />
        </div>
      </SmoothScroll>
    </ThemeProvider>
  );
}
