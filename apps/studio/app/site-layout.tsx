import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SmoothScroll from "@/components/providers/SmoothScroll";
import RouteTransition from "@/components/providers/RouteTransition";
import ScrollProgress from "@/components/providers/ScrollProgress";
import LeadTracking from "@/components/providers/LeadTracking";
import GoogleAnalytics from "@/components/providers/GoogleAnalytics";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SmoothScroll>
      <div id="zerocraft">
        <LeadTracking />
        <GoogleAnalytics />
        <Navbar />
        <ScrollProgress />
        <RouteTransition>{children}</RouteTransition>
        <Footer />
      </div>
    </SmoothScroll>
  );
}
