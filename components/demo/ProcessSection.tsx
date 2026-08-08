"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Play } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export default function ProcessSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".process-title", {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
        },
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: "power2.out"
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 bg-white">
      <div className="kora-container">
        <div className="max-w-4xl mx-auto text-center mb-20">
          <h2 className="process-title text-4xl md:text-6xl font-medium tracking-tight mb-6 leading-tight">
            Most consultancies <br/> slow you down with <br/> process and overhead.
          </h2>
          <p className="process-title text-xl text-gray-500 max-w-2xl mx-auto">
            We built our process to get to revenue impact in weeks, not quarters.
          </p>
        </div>

        {/* Phases Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-[#1E1F1E] text-white p-8 rounded-[32px] md:col-span-1">
            <div className="text-xs uppercase tracking-widest text-gray-400 mb-8 flex items-center justify-between">
              Phase 01 <span className="flex gap-1"><span className="w-1 h-1 bg-white rounded-full"></span><span className="w-1 h-1 bg-gray-600 rounded-full"></span><span className="w-1 h-1 bg-gray-600 rounded-full"></span><span className="w-1 h-1 bg-gray-600 rounded-full"></span></span>
            </div>
            <h4 className="text-xl font-medium mb-4">Diagnose</h4>
            <p className="text-sm text-gray-400 leading-relaxed">
              Deep discovery into your market position, funnel economics, team structure, and strategic constraints. We find the root bottleneck, not just the surface symptoms.
            </p>
          </div>
          <div className="bg-[#F4F6F5] p-8 rounded-[32px] flex items-center justify-center text-gray-300 text-2xl font-medium">02</div>
          <div className="bg-[#F4F6F5] p-8 rounded-[32px] flex items-center justify-center text-gray-300 text-2xl font-medium">03</div>
          <div className="bg-[#F4F6F5] p-8 rounded-[32px] flex items-center justify-center text-gray-300 text-2xl font-medium">04</div>
        </div>

        {/* Video Block */}
        <div className="relative rounded-[40px] overflow-hidden mb-12 h-[600px] bg-gray-900 group cursor-pointer">
          <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2574&auto=format&fit=crop" alt="Team meeting" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          <div className="absolute bottom-10 left-10 text-white">
             <div className="text-xs font-bold uppercase tracking-widest mb-4 bg-white/20 backdrop-blur-md inline-block px-3 py-1 rounded-full">0:59</div>
             <h3 className="text-4xl md:text-5xl font-medium mb-2">How we work</h3>
             <p className="text-gray-300 text-lg">See our process in under 60 seconds.</p>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
               <Play className="w-8 h-8 text-white fill-white ml-1" />
             </div>
          </div>
        </div>

        {/* Features row */}
        <div className="bg-[#1E1F1E] text-white rounded-[40px] p-10 md:p-14">
          <h3 className="text-3xl md:text-4xl font-medium mb-12 max-w-xl leading-tight">
            We operate at the pace of your pipeline, not a project plan.
          </h3>
          <div className="grid md:grid-cols-3 gap-10">
            <div>
              <h4 className="text-lg font-medium mb-4 flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">1</span> Performance Tracking</h4>
              <p className="text-sm text-gray-400 leading-relaxed">Real-time dashboards on area metrics that matters. Monthly reports on pipeline health, revenue velocity, and ROI.</p>
            </div>
            <div>
              <h4 className="text-lg font-medium mb-4 flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">2</span> Ongoing Optimization</h4>
              <p className="text-sm text-gray-400 leading-relaxed">Quarterly reviews to refine what's working and cut what isn't. Adjust positioning, mix pricing, scale the wins.</p>
            </div>
            <div>
              <h4 className="text-lg font-medium mb-4 flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">3</span> Support & Training</h4>
              <p className="text-sm text-gray-400 leading-relaxed">Train new hires on the playbooks, update processes, get answers when you need them.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
