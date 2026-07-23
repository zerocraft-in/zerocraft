
import CTA from "@/components/sections/cta.section";
import Hero from "@/components/sections/hero.section";
import Approach from "@/components/sections/process.section";
import WhyZerocraft from "@/components/sections/why.section";

export default function Home() {
  return (
    <div id="home-page" className="page-wrapper">
      <Hero />
      <WhyZerocraft />
      <Approach />
      <CTA />
    </div>
  );
}

