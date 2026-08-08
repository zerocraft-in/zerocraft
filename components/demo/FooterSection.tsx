"use client";

import { Check, ArrowRight } from "lucide-react";

export default function FooterSection() {
  return (
    <footer className="bg-white">
      {/* Top CTA Form Section */}
      <div className="pt-24 pb-10">
        <div className="kora-container relative z-10 flex flex-col md:flex-row gap-16 rounded-[40px] overflow-hidden p-10 md:p-20 shadow-2xl">
           <img 
              src="https://images.unsplash.com/photo-1546842931-886c185b4c8c?q=80&w=2574&auto=format&fit=crop" 
              alt="Flower Background"
              className="absolute inset-0 w-full h-full object-cover opacity-30 blur-[10px] scale-110 mix-blend-multiply"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-100/90 to-emerald-100/90 mix-blend-overlay"></div>
            
            <div className="w-full md:w-1/2 relative z-10">
              <h2 className="text-5xl md:text-7xl font-medium tracking-tight mb-10 text-gray-900 leading-tight">
                Let's find <br/> your next <br/> growth lever.
              </h2>
              <ul className="space-y-4 mb-16 text-gray-800 font-medium">
                <li className="flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center"><Check className="w-4 h-4 text-emerald-600" /></div> Actionable growth roadmap</li>
                <li className="flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center"><Check className="w-4 h-4 text-emerald-600" /></div> Channel & funnel diagnostics</li>
                <li className="flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center"><Check className="w-4 h-4 text-emerald-600" /></div> Clear next steps & timeline</li>
              </ul>
              
              <div className="bg-white/60 backdrop-blur-md p-6 rounded-3xl max-w-sm border border-white/50">
                <p className="text-gray-900 font-medium mb-4 italic">"What sets Kora apart is their commitment to building our capabilities, not creating dependency."</p>
                <div className="flex items-center gap-4">
                  <img src="https://i.pravatar.cc/150?u=9" alt="Avatar" className="w-10 h-10 rounded-full" />
                  <div>
                    <div className="font-bold text-sm">Jennifer Holland</div>
                    <div className="text-xs text-gray-500">CEO, Bravance</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full md:w-1/2 relative z-10">
               <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[32px] shadow-sm border border-white">
                  <div className="flex items-center gap-2 font-bold text-xl mb-6">
                    <div className="w-5 h-5 rounded-full bg-emerald-400"></div>
                    kora™
                  </div>
                  <p className="text-sm text-gray-600 mb-8 font-medium">No pitch decks, no pressure. Tell us where you are and we'll share how we can help.</p>
                  
                  <form className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Name</label>
                        <input type="text" className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500" placeholder="Jane Doe" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Email</label>
                        <input type="email" className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500" placeholder="jane@company.com" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">What services are you interested in?</label>
                      <div className="flex flex-wrap gap-2">
                         <span className="px-4 py-2 border border-gray-200 rounded-full text-sm font-medium bg-white/50 cursor-pointer hover:border-emerald-500">Go to Market</span>
                         <span className="px-4 py-2 border border-emerald-500 bg-emerald-50 text-emerald-800 rounded-full text-sm font-medium cursor-pointer">Growth Strategy</span>
                         <span className="px-4 py-2 border border-gray-200 rounded-full text-sm font-medium bg-white/50 cursor-pointer hover:border-emerald-500">Revenue Operations</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200 mt-6 flex items-center justify-between">
                       <div className="text-xs text-gray-500 font-medium">
                         We'll reach out within 24<br/>hours to schedule your call.
                       </div>
                       <button type="button" className="bg-[#1E1F1E] text-white px-6 py-3 rounded-full font-medium text-sm hover:bg-black transition-colors flex items-center gap-2">
                         Book a call <ArrowRight className="w-4 h-4" />
                       </button>
                    </div>
                  </form>
               </div>
            </div>
        </div>
      </div>

      {/* Actual Footer */}
      <div className="bg-[#52C489] rounded-t-[60px] pt-24 pb-12 px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between mb-20 gap-16">
            <div className="w-full md:w-1/3">
               <div className="flex items-center gap-2 font-bold text-3xl text-emerald-950 mb-10">
                 <div className="w-6 h-6 rounded-full bg-white"></div>
                 kora™
               </div>
               <h3 className="text-4xl md:text-5xl font-medium text-emerald-950 mb-10 leading-tight">
                 Subscribe to our newsletter.
               </h3>
               <div className="flex items-center bg-white rounded-full p-1 max-w-sm mb-4">
                 <input type="email" placeholder="Email" className="bg-transparent flex-1 px-4 py-2 focus:outline-none" />
                 <button className="bg-[#52C489] text-emerald-950 font-medium px-6 py-2 rounded-full border border-emerald-600">Subscribe →</button>
               </div>
               <p className="text-xs text-emerald-950/60 font-medium">By subscribing, you agree to our privacy policy.</p>
            </div>
            
            <div className="w-full md:w-1/2 flex flex-col md:flex-row gap-16">
               <div className="flex-1">
                 <p className="text-2xl font-medium text-emerald-950 mb-10 leading-snug">
                   Stalled revenue, leaky funnels, stretched leadership. Whatever's holding you back, let's solve it.
                 </p>
                 <div className="flex items-center gap-4 mb-10">
                   <img src="https://i.pravatar.cc/150?u=a" alt="Avatar" className="w-12 h-12 rounded-full border-2 border-emerald-700/20" />
                   <div>
                     <div className="font-bold text-emerald-950">Karolina Spencer</div>
                     <div className="text-sm text-emerald-950/70 font-medium">Founder & CEO</div>
                   </div>
                 </div>
                 <div className="text-emerald-950 font-medium text-lg mb-2">(312) 895-6500</div>
                 <div className="text-emerald-950 font-medium text-lg">hello@kora.com</div>
               </div>
               
               <div>
                 <div className="text-sm font-bold uppercase tracking-widest text-emerald-950/60 mb-6">Navigation</div>
                 <ul className="space-y-4 text-emerald-950 font-medium text-lg">
                   <li><a href="#" className="hover:opacity-70 transition-opacity">Case Studies</a></li>
                   <li><a href="#" className="hover:opacity-70 transition-opacity flex items-center gap-2">Insights <div className="w-2 h-2 rounded-full bg-red-500"></div></a></li>
                   <li><a href="#" className="hover:opacity-70 transition-opacity">About us</a></li>
                   <li><a href="#" className="hover:opacity-70 transition-opacity">Contact</a></li>
                 </ul>
               </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-emerald-900/10 text-emerald-950/60 font-medium text-sm">
            <div className="flex gap-4 mb-4 md:mb-0">
               <a href="#" className="hover:text-emerald-950">X</a>
               <a href="#" className="hover:text-emerald-950">in</a>
               <a href="#" className="hover:text-emerald-950">f</a>
            </div>
            <div>
              <a href="#" className="mr-6 hover:text-emerald-950">Privacy Policy</a>
              <a href="#" className="hover:text-emerald-950">Terms of Service</a>
            </div>
            <div>
              © 2024 Kora All rights reserved.
            </div>
          </div>
          
          {/* Big Text */}
          <div className="mt-20">
             <h1 className="text-[12vw] font-bold tracking-tighter text-emerald-950/20 leading-none">kora</h1>
          </div>
        </div>
      </div>
    </footer>
  );
}
