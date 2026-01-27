
import { CTASection } from "@/components/sections/cta.section";
import { FAQSection } from "@/components/sections/faq.section";
import { OurServices } from "@/components/sections/services.section";
import TestimoinalsSection from "@/components/sections/testimonial.section";
import Hero from "@/components/sections/hero.section";

export default function Home() {
  return (
    <div className="py-10">
      <Hero />
      <OurServices />
      {/* <StickyScrollRevealDemo /> */}
      <FAQSection />
      <TestimoinalsSection />
      <CTASection />
    </div>
  );
}
