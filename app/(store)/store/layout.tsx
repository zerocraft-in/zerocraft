import "@/styles/index.css";
import { Manrope, JetBrains_Mono } from "next/font/google";
import StoreHeader from "@/components/store/StoreHeader";
import StoreFooter from "@/components/store/StoreFooter";
import CartDrawer from "@/components/store/CartDrawer";
import SearchModal from "@/components/store/SearchModal";
import QuickViewModal from "@/components/store/QuickViewModal";
import { ThemeProvider } from "@/components/providers/theme-provider";
import SmoothScroll from "@/components/providers/SmoothScroll";
import { Toaster } from "sonner";
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
        <div id="zerocraft-store" className={cn(manrope.variable, jetbrainsMono.variable, "min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white transition-colors duration-500 font-primary")}>
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
      </SmoothScroll>
    </ThemeProvider>
  );
}
