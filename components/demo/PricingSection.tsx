"use client";

import { Check } from "lucide-react";
import { useState } from "react";

export default function PricingSection() {
  const [activePlan, setActivePlan] = useState("sprint");

  return (
    <section className="py-24 bg-[#F4F6F5]">
      <div className="kora-container">
        <div className="max-w-xl mb-16">
          <h2 className="text-5xl md:text-7xl font-medium tracking-tight leading-tight">
            Pricing for your <br/> next stage.
          </h2>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Left panel */}
          <div className="w-full md:w-1/3 flex flex-col gap-4">
            <div 
              onClick={() => setActivePlan("sprint")}
              className={`p-6 rounded-[24px] cursor-pointer transition-all border ${activePlan === "sprint" ? "bg-white border-emerald-500 shadow-sm" : "bg-white/50 border-transparent hover:bg-white/80"}`}
            >
              <div className="flex items-center gap-4 mb-2">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${activePlan === "sprint" ? "border-emerald-500" : "border-gray-300"}`}>
                   {activePlan === "sprint" && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>}
                </div>
                <h4 className="text-xl font-medium">Growth Sprint</h4>
              </div>
              <p className="text-sm text-gray-500 ml-9">Starts at $2500/mo</p>
            </div>

            <div 
              onClick={() => setActivePlan("partner")}
              className={`p-6 rounded-[24px] cursor-pointer transition-all border ${activePlan === "partner" ? "bg-white border-emerald-500 shadow-sm" : "bg-white/50 border-transparent hover:bg-white/80"}`}
            >
              <div className="flex items-center gap-4 mb-2">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${activePlan === "partner" ? "border-emerald-500" : "border-gray-300"}`}>
                   {activePlan === "partner" && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>}
                </div>
                <h4 className="text-xl font-medium flex items-center gap-2">
                  Growth Partnership
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Popular</span>
                </h4>
              </div>
              <p className="text-sm text-gray-500 ml-9">Starts at $8500/mo</p>
            </div>

            <div 
              onClick={() => setActivePlan("custom")}
              className={`p-6 rounded-[24px] cursor-pointer transition-all border ${activePlan === "custom" ? "bg-white border-emerald-500 shadow-sm" : "bg-white/50 border-transparent hover:bg-white/80"}`}
            >
              <div className="flex items-center gap-4 mb-2">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${activePlan === "custom" ? "border-emerald-500" : "border-gray-300"}`}>
                   {activePlan === "custom" && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>}
                </div>
                <h4 className="text-xl font-medium">Custom</h4>
              </div>
              <p className="text-sm text-gray-500 ml-9">Get a quote</p>
            </div>
            
            <p className="text-sm text-gray-500 mt-6 px-4">
              All engagements start with a free <strong>30-minute discovery call</strong>. No commitment required.
            </p>
          </div>

          {/* Right panel */}
          <div className="w-full md:w-2/3 bg-emerald-950 text-white rounded-[40px] p-10 md:p-14 flex flex-col justify-between relative overflow-hidden">
             <div>
               <div className="text-sm font-bold uppercase tracking-widest text-emerald-500 mb-4">Startup</div>
               <div className="flex items-baseline gap-2 mb-6">
                 <span className="text-6xl md:text-8xl font-medium tracking-tight">$2500</span>
                 <span className="text-xl text-gray-400">/mo</span>
               </div>
               <p className="text-lg text-gray-300 mb-12 max-w-md">
                 A focused, 8-week engagement to diagnose your biggest growth blocker and build the plan to fix it.
               </p>
             </div>
             
             <div className="grid md:grid-cols-2 gap-y-4 gap-x-8 mb-12 relative z-10">
               {[
                 "Full funnel diagnostic audit", 
                 "90-day growth roadmap", 
                 "Weekly strategy sessions", 
                 "Conversion optimization plan", 
                 "30-day post-engagement check-in"
               ].map((feature, i) => (
                 <div key={i} className="flex items-center gap-3">
                   <div className="bg-emerald-500/20 p-1 rounded-full text-emerald-400">
                     <Check className="w-4 h-4" />
                   </div>
                   <span className="text-sm">{feature}</span>
                 </div>
               ))}
             </div>

             <div className="relative z-10">
               <button className="bg-white text-emerald-950 hover:bg-emerald-50 px-8 py-4 rounded-full font-medium transition-colors w-full md:w-auto">
                 Get Started
               </button>
             </div>

             {/* Decorative element */}
             <div className="absolute -right-20 -top-20 w-96 h-96 bg-emerald-900 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
