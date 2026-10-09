import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Services from "@/components/sections/Services";
import Works from "@/components/sections/Works";
import Process from "@/components/sections/Process";
import FAQ from "@/components/sections/FAQ";
import CTA from "@/components/sections/CTA";

export default function Home() {
  return (
    <main className="site-main">
      <Hero />
      <Works />
      <Services />
      <About />
      <Process />
      <FAQ />
      <CTA />
    </main>
  );
}
