import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Services from "@/components/sections/Services";
import Showcase from "@/components/sections/Showcase";
import Works from "@/components/sections/Works";
import Process from "@/components/sections/Process";
import Clients from "@/components/sections/Clients";
import Testimonials from "@/components/sections/Testimonials";
import CTA from "@/components/sections/CTA";

export default function Home() {
  return (
    <main className="site-main">
      <Hero />
      <About />
      <Services />
      <Showcase />
      <Works />
      <Process />
      <Clients />
      <Testimonials />
      <CTA />
    </main>
  );
}
