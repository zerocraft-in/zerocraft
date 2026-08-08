"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const services = [
  {
    id: "01",
    title: "Launches that land and scale.",
    category: "Go-to-Market",
    description: "Whether you're launching a new product or entering a new segment, we design the GTM motion that lands and scales.",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=800&auto=format&fit=crop",
    offerings: ["Launch Strategy & Execution", "ICP & Persona Development", "Messaging & Value Proposition"],
  },
  {
    id: "02",
    title: "Strategy that turns ambition into revenue.",
    category: "Growth Strategy",
    description: "We build the roadmap that gets you from where you are to where the revenue needs to be.",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800&auto=format&fit=crop",
    offerings: ["Market Sizing & Opportunity Mapping", "Revenue Core Architecture", "Competitive Positioning"],
  }
];

export default function ServicesSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray(".service-card");
      cards.forEach((card: any, i) => {
        gsap.from(card, {
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
          },
          y: 50,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
        });
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="py-24 bg-[#F4F6F5]">
      <div className="kora-container">
        <h2 className="text-6xl md:text-8xl font-medium tracking-tight mb-12">Services.</h2>
        
        {/* Timeline Header (simplified) */}
        <div className="mb-20 max-w-4xl">
          <p className="text-xl md:text-2xl text-gray-700 leading-relaxed font-medium mb-10">
            Within six months of working with Kora, clients experienced an average <span className="text-emerald-600">47% increase in annual revenue</span> based on pre and post-engagement performance.
          </p>
          <div className="w-full bg-white h-12 rounded-full flex overflow-hidden border border-gray-200">
             <div className="w-1/3 bg-gray-100 flex items-center px-6 text-xs font-bold text-gray-500">Without Kora</div>
             <div className="w-2/3 bg-emerald-400 flex items-center px-6 text-xs font-bold text-emerald-950">With Kora</div>
          </div>
        </div>

        <div className="space-y-10">
          {services.map((svc) => (
            <div key={svc.id} className="service-card bg-white rounded-[40px] p-8 md:p-12 flex flex-col md:flex-row gap-12 shadow-sm border border-gray-100">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                       <ArrowRight className="w-4 h-4 text-gray-500 -rotate-45" />
                    </div>
                    <span className="text-sm font-medium uppercase tracking-widest text-gray-500">{svc.category}</span>
                  </div>
                  <h3 className="text-3xl md:text-4xl font-medium leading-tight mb-6">{svc.title}</h3>
                  <p className="text-gray-600 mb-10 text-lg max-w-md">{svc.description}</p>
                </div>
                
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">What we offer</div>
                  <div className="flex flex-wrap gap-2 mb-8">
                    {svc.offerings.map((offering, i) => (
                      <span key={i} className="px-4 py-2 bg-gray-50 rounded-full text-sm font-medium text-gray-700 border border-gray-200">
                        {offering}
                      </span>
                    ))}
                  </div>
                  <button className="kora-btn w-full md:w-auto">
                    Get Started
                  </button>
                </div>
              </div>

              <div className="flex-1 relative rounded-[32px] overflow-hidden min-h-[400px]">
                <img src={svc.image} alt={svc.title} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute top-6 right-6 text-white text-xl font-medium bg-black/20 backdrop-blur-md px-4 py-2 rounded-full">
                  {svc.id}
                </div>
                {/* Floating Testimonial could go here */}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
