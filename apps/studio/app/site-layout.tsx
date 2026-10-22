import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SmoothScroll from "@/components/providers/SmoothScroll";
import RouteTransition from "@/components/providers/RouteTransition";
import ScrollProgress from "@/components/providers/ScrollProgress";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SmoothScroll>
      <div id="zerocraft">
        <Navbar />
        <ScrollProgress />
        <RouteTransition>{children}</RouteTransition>
        <Footer />
      </div>
    </SmoothScroll>
  );
}
