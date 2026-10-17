import "@/styles/index.css";
import Navbar from "@/components/layout/Navbar";
import { ThemeProvider } from "@/components/providers/theme-provider";
import SmoothScroll from "@/components/providers/SmoothScroll";
import Footer from "@/components/layout/Footer";
import { domainOrigin } from "@/lib/domains";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(domainOrigin("studio")),
  alternates: { canonical: domainOrigin("studio") },
};
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <SmoothScroll>
        <div id="zerocraft" className="font-primary">

          <Navbar />
          {children}
          <Footer />
        </div>
      </SmoothScroll>
    </ThemeProvider>
  );
}
