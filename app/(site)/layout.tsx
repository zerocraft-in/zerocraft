import "@/styles/index.css";
import Navbar from "@/components/layout/Navbar";
import { ThemeProvider } from "@/components/providers/theme-provider";
import SmoothScroll from "@/components/providers/SmoothScroll";
import Footer from "@/components/layout/Footer";
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
