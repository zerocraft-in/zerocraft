"use client";

import { Plus, Minus } from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    q: "What exactly does Kora do?",
    a: "We help B2B companies between $2M and $50M in revenue grow faster and more predictably. That means diagnosing what is stalling your growth, building the strategy to fix it, and working alongside your team to execute."
  },
  {
    q: "What industries do you work with?",
    a: "We work across B2B industries including SaaS, professional services, fintech, and healthcare. The common thread is companies with a strong product that need help building a repeatable growth engine."
  },
  {
    q: "How is Kora different from a marketing agency?",
    a: "We focus on revenue, not just leads. Our approach encompasses marketing, sales, and customer success to ensure sustainable growth across the entire funnel."
  },
  {
    q: "Who on our team would work with Kora?",
    a: "We typically work directly with Founders, CEOs, and revenue leaders (CRO, CMO, VP Sales) to align strategy and execution."
  }
];

export default function FAQSection() {
  const [open, setOpen] = useState(0);

  return (
    <section className="py-32 bg-white">
      <div className="kora-container max-w-4xl">
        <h2 className="text-6xl md:text-8xl font-medium tracking-tight text-center mb-16">FAQ</h2>
        
        <div className="flex flex-wrap justify-center gap-2 mb-16">
           <button className="bg-emerald-100 text-emerald-800 px-6 py-2 rounded-full font-medium text-sm">General</button>
           <button className="bg-gray-100 text-gray-600 hover:bg-gray-200 px-6 py-2 rounded-full font-medium text-sm transition-colors">Pricing</button>
           <button className="bg-gray-100 text-gray-600 hover:bg-gray-200 px-6 py-2 rounded-full font-medium text-sm transition-colors">Process</button>
           <button className="bg-gray-100 text-gray-600 hover:bg-gray-200 px-6 py-2 rounded-full font-medium text-sm transition-colors">Results</button>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div 
              key={i} 
              className={`border border-gray-200 rounded-[24px] overflow-hidden transition-colors ${open === i ? 'bg-[#F4F6F5]' : 'bg-white hover:bg-gray-50'}`}
            >
              <button 
                onClick={() => setOpen(open === i ? -1 : i)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-medium text-lg text-gray-900">{faq.q}</span>
                <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                  {open === i ? <Minus className="w-4 h-4 text-gray-500" /> : <Plus className="w-4 h-4 text-gray-500" />}
                </div>
              </button>
              
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${open === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <p className="p-6 pt-0 text-gray-600 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">More questions? Reach out anytime.</p>
          <div className="inline-flex items-center gap-4 bg-emerald-50 px-8 py-4 rounded-full">
            <div className="flex -space-x-3">
               <img src="https://i.pravatar.cc/150?u=1" className="w-10 h-10 rounded-full border-2 border-white" alt="Avatar"/>
               <img src="https://i.pravatar.cc/150?u=2" className="w-10 h-10 rounded-full border-2 border-white" alt="Avatar"/>
               <img src="https://i.pravatar.cc/150?u=3" className="w-10 h-10 rounded-full border-2 border-white" alt="Avatar"/>
            </div>
            <a href="mailto:support@kora.com" className="font-medium text-lg text-emerald-900 hover:text-emerald-700">support@kora.com</a>
          </div>
        </div>
      </div>
    </section>
  );
}
