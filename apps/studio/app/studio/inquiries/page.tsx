import { Inbox, CheckCircle2, Clock, Mail, MessageSquare } from "lucide-react";
import { Button } from "@zerocraft/ui/components/button";
import { Badge } from "@zerocraft/ui/components/badge";

export default function InquiriesDashboard() {
  const inquiries = [
    {
      id: "inq_1",
      name: "Alex Vance",
      company: "Aesthetic Labs",
      email: "alex@aestheticlabs.io",
      projectType: "Full E-Commerce Architecture",
      budget: "$15,000 - $25,000",
      timeline: "Q3 2026",
      status: "New",
      date: "Nov 03, 2026",
      message: "We're launching a limited drop streetwear brand focused on generative typography. We need a performant Next.js store with bespoke micro-interactions and Supabase backend.",
    },
    {
      id: "inq_2",
      name: "Marcus Aurel",
      company: "Kinetix Studio",
      email: "marcus@kinetix.design",
      projectType: "WebGL Spatial Showroom",
      budget: "$10,000 - $15,000",
      timeline: "Immediately",
      status: "In Review",
      date: "Nov 02, 2026",
      message: "Looking for an interactive 3D product visualizer that loads fast on mobile and supports realistic lighting and materials.",
    },
    {
      id: "inq_3",
      name: "Sophia Chen",
      company: "Founders Guild",
      email: "team@foundersguild.co",
      projectType: "Design System & Frontend",
      budget: "$5,000 - $10,000",
      timeline: "Flexible",
      status: "Contacted",
      date: "Oct 31, 2026",
      message: "Need a comprehensive design tokens system and Tailwind UI component library for our internal enterprise tooling.",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Client Inquiries & Briefs</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Review incoming project proposals, budget parameters, and client contact information.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {inquiries.map((inq) => (
          <div key={inq.id} className="p-6 rounded-xl glass-panel space-y-4 border border-zinc-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/60 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white text-base">{inq.company}</h3>
                  <span className="text-xs text-zinc-500 font-mono">({inq.name})</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mt-1">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  <a href={`mailto:${inq.email}`} className="hover:underline">{inq.email}</a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge 
                  variant="outline"
                  className={`text-xs font-mono font-medium ${
                    inq.status === 'New' ? 'border-amber-400/30 text-amber-300 bg-amber-400/10' :
                    inq.status === 'In Review' ? 'border-indigo-400/30 text-indigo-300 bg-indigo-400/10' :
                    'border-zinc-800 text-zinc-400'
                  }`}
                >
                  {inq.status}
                </Badge>
                <span className="text-xs font-mono text-zinc-500">{inq.date}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-1 text-xs font-mono">
              <div className="bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/80">
                <span className="text-zinc-500">Service:</span>
                <p className="text-zinc-200 mt-0.5 font-sans font-medium">{inq.projectType}</p>
              </div>
              <div className="bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/80">
                <span className="text-zinc-500">Budget Range:</span>
                <p className="text-emerald-400 mt-0.5 font-semibold">{inq.budget}</p>
              </div>
              <div className="bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/80">
                <span className="text-zinc-500">Target Timeline:</span>
                <p className="text-zinc-200 mt-0.5">{inq.timeline}</p>
              </div>
            </div>

            <p className="text-sm text-zinc-300 bg-black/30 p-4 rounded-lg border border-zinc-900 leading-relaxed">
              &quot;{inq.message}&quot;
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" className="border-zinc-700 hover:border-zinc-500 text-xs text-zinc-300">
                Mark as Contacted
              </Button>
              <a
                href={`mailto:${inq.email}?subject=Zerocraft Studio: Project Discussion`}
              >
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Reply to Client</span>
                </Button>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
