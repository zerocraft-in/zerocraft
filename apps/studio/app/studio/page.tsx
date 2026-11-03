import Link from "next/link";
import { FolderKanban, Inbox, Eye, ArrowUpRight, CheckCircle2, Clock, Activity, Zap } from "lucide-react";
import { getStudioSupabaseConfig } from "@/lib/supabase";
import { Button } from "@zerocraft/ui/components/button";
import { Badge } from "@zerocraft/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@zerocraft/ui/components/card";

export default function StudioDashboard() {
  const supabaseConfig = getStudioSupabaseConfig();

  const stats = [
    { label: "Active Showcases", value: "3", change: "+1 this month", icon: FolderKanban, color: "text-indigo-400" },
    { label: "Client Inquiries", value: "8", change: "2 pending review", icon: Inbox, color: "text-amber-400" },
    { label: "Portfolio Visits", value: "24.5k", change: "+18.2% vs last mo", icon: Eye, color: "text-emerald-400" },
    { label: "Avg Response Time", value: "< 4h", change: "Enterprise SLA", icon: Zap, color: "text-purple-400" },
  ];

  const recentInquiries = [
    { client: "Aesthetic Labs", email: "alex@aestheticlabs.io", type: "Full E-Commerce Architecture", budget: "$15k - $25k", date: "2 hours ago", status: "New" },
    { client: "Kinetix Studio", email: "marcus@kinetix.design", type: "WebGL Spatial Showroom", budget: "$10k - $15k", date: "Yesterday", status: "In Review" },
    { client: "Founders Guild", email: "team@foundersguild.co", type: "Design System & Frontend", budget: "$5k - $10k", date: "3 days ago", status: "Contacted" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Studio Overview</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Manage showcase deliverables, client inquiries, and live Supabase synchronization.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/studio/projects">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs">
              + Add Showcase
            </Button>
          </Link>
          <Link href="/" target="_blank">
            <Button variant="outline" size="sm" className="text-xs border-zinc-700 hover:bg-zinc-800 text-zinc-300">
              <span>Live Portfolio</span>
              <ArrowUpRight className="w-3.5 h-3.5 ml-1 text-zinc-500" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row using @zerocraft/ui Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, idx) => (
          <Card key={idx} className="bg-[#12141c]/80 border-zinc-800/80 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white tracking-tight">{s.value}</div>
              <p className="text-[11px] text-zinc-500 mt-1 font-mono">{s.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Supabase Connection Status Banner */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-zinc-900 border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Supabase Multi-Tenant Engine Connected</h3>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Host: <span className="text-indigo-300">{supabaseConfig.url}</span> • Store ID: <span className="text-indigo-300">{supabaseConfig.storeId}</span>
            </p>
          </div>
        </div>
        <Link
          href="/studio/settings"
          className="text-xs font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 shrink-0"
        >
          View Config & Diagnostics →
        </Link>
      </div>

      {/* Recent Inquiries Section */}
      <div className="glass-panel rounded-xl overflow-hidden border border-zinc-800">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Recent Project Inquiries</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Prospective commissions from portfolio submission form</p>
          </div>
          <Link href="/studio/inquiries" className="text-xs font-medium text-indigo-400 hover:underline">
            View All
          </Link>
        </div>

        <div className="divide-y divide-zinc-800/60 overflow-x-auto">
          {recentInquiries.map((inq, idx) => (
            <div key={idx} className="p-4 flex items-center justify-between text-xs hover:bg-zinc-800/20 transition-colors">
              <div className="min-w-[180px]">
                <p className="font-semibold text-zinc-200">{inq.client}</p>
                <p className="text-[11px] font-mono text-zinc-500">{inq.email}</p>
              </div>

              <div className="min-w-[180px]">
                <span className="text-zinc-300">{inq.type}</span>
              </div>

              <div className="min-w-[100px] font-mono text-zinc-400">
                {inq.budget}
              </div>

              <div className="min-w-[80px] font-mono text-zinc-500">
                {inq.date}
              </div>

              <div>
                <Badge 
                  variant="outline" 
                  className={`text-[10px] font-mono ${
                    inq.status === 'New' ? 'border-amber-400/30 text-amber-300 bg-amber-400/10' :
                    inq.status === 'In Review' ? 'border-indigo-400/30 text-indigo-300 bg-indigo-400/10' :
                    'border-zinc-700 text-zinc-400'
                  }`}
                >
                  {inq.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
