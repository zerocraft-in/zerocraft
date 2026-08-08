"use client";

import { Plus } from "lucide-react";

const team = [
  { name: "Karolina Spencer", role: "Founder & CEO" },
  { name: "Priya Sharma", role: "Head of Growth Strategy" },
  { name: "James Okora", role: "Senior Growth Consultant" },
  { name: "Alex Tanaka", role: "Growth Operations Lead" },
  { name: "David Wilson", role: "Head of Client Solutions" },
  { name: "Rachel Andersen", role: "Revenue Strategist" },
];

export default function TeamSection() {
  return (
    <section className="py-24 bg-[#52C489] text-emerald-950 overflow-hidden">
      <div className="kora-container">
        <h2 className="text-5xl md:text-7xl font-medium tracking-tight mb-16 max-w-3xl leading-tight">
          Meet the team behind the growth.
        </h2>

        <div className="grid md:grid-cols-2 gap-y-4 gap-x-12 mb-20 relative z-10">
          {team.map((member, i) => (
            <div key={i} className="group flex items-center justify-between p-4 border-b border-emerald-950/10 hover:bg-emerald-800/10 transition-colors rounded-xl cursor-pointer">
              <div className="flex items-center gap-4">
                <img 
                  src={`https://i.pravatar.cc/150?u=${i}`} 
                  alt={member.name} 
                  className="w-12 h-12 rounded-full border-2 border-emerald-900/10"
                />
                <div>
                  <div className="font-medium text-lg">{member.name}</div>
                  <div className="text-sm opacity-80">{member.role}</div>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-950/10 flex items-center justify-center group-hover:bg-emerald-950 group-hover:text-white transition-all">
                <Plus className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-10 items-end">
          <div className="flex-1 rounded-[40px] overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=2000&auto=format&fit=crop" 
              alt="Team working" 
              className="w-full h-[400px] object-cover"
            />
          </div>
          <div className="w-full md:w-80 mb-10">
            <h3 className="text-3xl font-medium mb-4">Join us,<br/>we're hiring.</h3>
            <p className="text-sm opacity-80 mb-6 font-medium">
              We're looking for highly ambitious and talented people to help us drive real growth.
            </p>
            <button className="bg-emerald-950 text-white px-6 py-3 rounded-full font-medium text-sm hover:bg-black transition-colors flex items-center gap-2">
              Apply Now <Plus className="w-4 h-4 rotate-45" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
