
import CTA from "@/components/sections/cta.section";
import Hero from "@/components/sections/hero.section";
import Approach from "@/components/sections/process.section";
import WhyZerocraft from "@/components/sections/why.section";
import Header from "./header";
import Footer from "./footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>

        <div id="home-page">
          <Hero />
          <WhyZerocraft />
          <Approach />
          <CTA />
        </div>

      </main>
      <Footer /></>

  );
}
