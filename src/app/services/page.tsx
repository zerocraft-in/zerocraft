import { CTASection } from "@/components/sections/cta.section";
import { FAQSection } from "@/components/sections/faq.section";
import { OurServices } from "@/components/sections/services.section";
import { StickyScrollRevealDemo } from "@/components/sections/sticky";
import TestimoinalsSection from "@/components/sections/testimonial.section";

export default function Home() {
  return (
    <div>
      <OurServices />
      {/* <StickyScrollRevealDemo /> */}
      <FAQSection />
      <TestimoinalsSection />
      <CTASection />
    </div>
  );
}
