"use client";

import { Star } from "lucide-react";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function TestimonialsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".stats-card", {
        scrollTrigger: {
          trigger: ".stats-container",
          start: "top 80%",
        },
        y: 30,
        opacity: 0,
        stagger: 0.1,
        duration: 0.6
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 bg-[#F4F6F5]">
      <div className="kora-container">
        
        {/* Main Testimonial Block */}
        <div className="bg-white rounded-[40px] overflow-hidden shadow-sm flex flex-col md:flex-row mb-24 border border-gray-100">
           <div className="flex-1 p-12 md:p-20 flex flex-col justify-center">
             <h2 className="text-5xl md:text-7xl font-medium tracking-tight mb-12">Testimonials</h2>
             <p className="text-2xl md:text-3xl font-medium leading-tight text-gray-900 mb-10">
               "Kora didn't just give us a strategy—they helped us become a more strategic company."
             </p>
             <div className="flex items-center gap-4">
               <img src="https://i.pravatar.cc/150?u=a" alt="Avatar" className="w-14 h-14 rounded-full" />
               <div>
                 <div className="font-bold">Sarah Bourman</div>
                 <div className="text-sm text-gray-500">CEO, LightSpeed</div>
               </div>
             </div>
           </div>
           <div className="flex-1 relative min-h-[400px]">
             <img src="https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?q=80&w=2000&auto=format&fit=crop" alt="Office" className="absolute inset-0 w-full h-full object-cover" />
             <div className="absolute bottom-10 right-10 bg-white/90 backdrop-blur-md p-6 rounded-3xl flex items-end gap-2 shadow-xl">
                <span className="text-6xl font-medium tracking-tighter leading-none">4.9</span>
                <span className="text-lg text-gray-500 font-bold mb-1">/5</span>
                <div className="ml-4 text-xs font-bold uppercase tracking-widest text-gray-400 w-24">Average client rating</div>
             </div>
           </div>
        </div>

        {/* Small reviews grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-24">
          {[1,2,3].map((i) => (
            <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex text-emerald-500 mb-6">
                {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-current" />)}
              </div>
              <p className="text-gray-700 mb-8 leading-relaxed font-medium text-lg">
                "I was skeptical of consultants—we'd been burned before by firms that delivered pretty slides and then disappeared. Kora was different."
              </p>
              <div className="flex items-center gap-4">
               <img src={`https://i.pravatar.cc/150?u=rev${i}`} alt="Avatar" className="w-10 h-10 rounded-full" />
               <div>
                 <div className="font-bold text-sm">Marcus Thompson</div>
                 <div className="text-xs text-gray-500">President, Tree</div>
               </div>
             </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="stats-container grid grid-cols-2 md:grid-cols-4 gap-12 py-12 border-t border-b border-gray-200 mb-24">
          <div className="stats-card">
            <div className="text-4xl md:text-5xl font-medium mb-2">2.4<span className="text-emerald-500">x</span></div>
            <div className="text-sm text-gray-500">Revenue increase achieved within 18 months.</div>
          </div>
          <div className="stats-card">
            <div className="text-4xl md:text-5xl font-medium mb-2">40<span className="text-emerald-500">%</span></div>
            <div className="text-sm text-gray-500">Average reduction in customer acquisition costs.</div>
          </div>
          <div className="stats-card">
            <div className="text-4xl md:text-5xl font-medium mb-2">90<span className="text-emerald-500">%</span></div>
            <div className="text-sm text-gray-500">Client retention rate.</div>
          </div>
          <div className="stats-card">
            <div className="text-4xl md:text-5xl font-medium mb-2">12<span className="text-emerald-500">+</span></div>
            <div className="text-sm text-gray-500">Portfolios companies that have scaled Series B+ beyond.</div>
          </div>
        </div>

      </div>
    </section>
  );
}
