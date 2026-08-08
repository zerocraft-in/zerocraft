"use client";

import "@/styles/demo.css";
import SmoothScroll from "@/components/demo/SmoothScroll";
import DemoNavbar from "@/components/demo/DemoNavbar";
import HeroSection from "@/components/demo/HeroSection";
import StatementSection from "@/components/demo/StatementSection";
import ValuePropSection from "@/components/demo/ValuePropSection";
import ServicesSection from "@/components/demo/ServicesSection";
import ProcessSection from "@/components/demo/ProcessSection";
import TeamSection from "@/components/demo/TeamSection";
import TestimonialsSection from "@/components/demo/TestimonialsSection";
import PricingSection from "@/components/demo/PricingSection";
import FAQSection from "@/components/demo/FAQSection";
import InsightsSection from "@/components/demo/InsightsSection";
import FooterSection from "@/components/demo/FooterSection";

export default function DemoPage() {
  return (
    <SmoothScroll>
      <div className="kora-demo-body font-sans antialiased">
        <DemoNavbar />
        <main>
          <HeroSection />
          <StatementSection />
          <ValuePropSection />
          <ServicesSection />
          <ProcessSection />
          <TeamSection />
          <TestimonialsSection />
          <PricingSection />
          <FAQSection />
          <InsightsSection />
        </main>
        <FooterSection />
      </div>
    </SmoothScroll>
  );
}
