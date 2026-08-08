"use client";

import { ArrowRight } from "lucide-react";

const insights = [
  {
    category: "Technology Selection",
    date: "March 8, 2024",
    title: "Your CRM is not the problem: Your process is.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop"
  },
  {
    category: "Implementation",
    date: "March 1, 2024",
    title: "5 growth levers most companies ignore until it is too late.",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop"
  }
];

export default function InsightsSection() {
  return (
    <section className="py-24 bg-[#F4F6F5]">
      <div className="kora-container flex flex-col md:flex-row gap-16">
        <div className="w-full md:w-1/3">
          <h2 className="text-6xl md:text-7xl font-medium tracking-tight mb-8">Insights.</h2>
          <p className="text-xl text-gray-600 mb-10 max-w-sm">
            Lessons, frameworks, and honest takes on what it actually takes to grow.
          </p>
          <button className="kora-btn-outline bg-white border-gray-200">
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="w-full md:w-2/3 grid md:grid-cols-2 gap-8">
          {insights.map((insight, i) => (
            <div key={i} className="group cursor-pointer">
              <div className="relative rounded-[32px] overflow-hidden mb-6 h-80">
                <img 
                  src={insight.image} 
                  alt={insight.title} 
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                />
                <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                  {insight.category}
                </div>
              </div>
              <div className="text-sm font-medium text-gray-500 mb-2">{insight.date}</div>
              <h3 className="text-2xl font-medium leading-tight group-hover:text-emerald-600 transition-colors">
                {insight.title}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
