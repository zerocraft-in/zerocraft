"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowRight } from "lucide-react";

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-text", {
        y: 50,
        opacity: 0,
        duration: 1,
        stagger: 0.1,
        ease: "power3.out",
        delay: 0.5,
      });
      gsap.from(".hero-card", {
        y: 100,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        delay: 0.8,
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="relative min-h-screen pt-40 pb-20 overflow-hidden flex flex-col justify-between">
      {/* Background Image / Blur */}
      <div className="absolute inset-0 -z-10 bg-[#F4F6F5]">
        <img 
          src="https://images.unsplash.com/photo-1550684376-efcbd6e3f031?q=80&w=2574&auto=format&fit=crop" 
          alt="Flower Background"
          className="w-full h-full object-cover opacity-70 blur-[20px] scale-110 mix-blend-multiply"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#F4F6F5]/80 to-transparent"></div>
      </div>

      <div className="kora-container flex-grow flex flex-col relative z-10">
        <div className="max-w-3xl mt-10">
          <h1 className="kora-h1 hero-text mb-6">Your growth partner for companies ready to scale.</h1>
          <p className="kora-body text-xl max-w-lg mb-10 hero-text text-gray-700">
            Kora helps leadership teams gain clarity and build systems that scale.
          </p>
          <div className="flex items-center gap-4 hero-text">
            <button className="kora-btn">
              Our Services
              <ArrowRight className="w-4 h-4" />
            </button>
            <button className="kora-btn-outline border-gray-400">
              Pricing <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="kora-container relative z-10 mt-auto pt-20 flex flex-col md:flex-row justify-between items-end gap-10">
        <div className="hero-text">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Trusted by 10+ companies</p>
          <div className="flex gap-6 opacity-60">
             {/* Mock Logos */}
             <div className="font-bold text-xl">Sitemark</div>
             <div className="font-bold text-xl italic">Hamilton</div>
             <div className="font-bold text-xl">LogicIpsum</div>
          </div>
        </div>

        <div className="hero-card bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-xl max-w-sm border border-white/40">
          <div className="text-xs font-bold uppercase text-gray-500 mb-2">New Case Study</div>
          <p className="font-medium text-gray-900 mb-6">
            How Sitemark broke through an $18M plateau and grew 47% in six months.
          </p>
          <div className="flex items-center justify-between">
             <div>
               <div className="text-3xl font-medium tracking-tight">47%</div>
               <div className="text-xs text-gray-500">Revenue growth in 6 months</div>
             </div>
             <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
               <ArrowRight className="w-5 h-5 -rotate-45" />
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
