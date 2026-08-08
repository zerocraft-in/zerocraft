"use client";

import { Check, X } from "lucide-react";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function ValuePropSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".vp-title", {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
        },
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: "power2.out"
      });

      gsap.from(".vp-card", {
        scrollTrigger: {
          trigger: ".vp-cards-container",
          start: "top 70%",
        },
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power2.out"
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 bg-white">
      <div className="kora-container">
        <h2 className="vp-title text-center text-4xl md:text-5xl font-medium tracking-tight mb-20">
          What changes when <br/> you work with us.
        </h2>

        <div className="vp-cards-container grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Before Card */}
          <div className="vp-card bg-[#F4F6F5] p-10 md:p-14 rounded-[40px] flex flex-col justify-between min-h-[500px]">
            <div>
              <div className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">Before kora™</div>
              <h3 className="text-3xl md:text-4xl font-medium text-gray-900 leading-tight mb-10">
                Guessing what grows revenue.
              </h3>
            </div>
            
            <ul className="space-y-4">
              {[
                "Hiring more reps to fix a conversion problem.",
                "Pipeline that looks full but never closes.",
                "Pricing based on what competitors charge.",
                "Every quarter starts from zero."
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-600">
                  <div className="mt-1 bg-white rounded-full p-1 shadow-sm">
                    <X className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* After Card */}
          <div className="vp-card bg-[#52C489] text-white p-10 md:p-14 rounded-[40px] flex flex-col justify-between min-h-[500px] shadow-lg shadow-emerald-500/20">
            <div>
              <div className="text-sm font-medium mb-4 uppercase tracking-wider text-emerald-950/60">With kora™</div>
              <h3 className="text-3xl md:text-4xl font-medium leading-tight mb-10 text-emerald-950">
                Knowing exactly what moves the number.
              </h3>
            </div>
            
            <ul className="space-y-4">
              {[
                "Every dollar of spend tied to revenue.",
                "Pipeline that converts predictably.",
                "Pricing built on what customers will pay.",
                "Compounding growth, quarter over quarter."
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-3 text-emerald-950/90">
                  <div className="mt-1 bg-emerald-800 rounded-full p-1 shadow-sm">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="leading-relaxed font-medium">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
