import Link from "next/link";
import { FolderKanban, Plus, ExternalLink, Sparkles, Filter } from "lucide-react";
import { Button } from "@zerocraft/ui/components/button";
import { Badge } from "@zerocraft/ui/components/badge";

export default function ProjectsDashboard() {
  const projects = [
    {
      id: "proj_1",
      title: "Cinema Streetwear Atelier",
      category: "Creative E-Commerce",
      client: "ZeroCraft Internal",
      year: "2026",
      status: "Published",
      featured: true,
      views: "14.2k",
    },
    {
      id: "proj_2",
      title: "ZeroCraft Unified CMS",
      category: "Platform Architecture",
      client: "Enterprise Suite",
      year: "2026",
      status: "Published",
      featured: true,
      views: "6.8k",
    },
    {
      id: "proj_3",
      title: "HyperScale Spatial Showroom",
      category: "Creative Engineering",
      client: "Voxel Dynamics",
      year: "2025",
      status: "Published",
      featured: false,
      views: "3.5k",
    },
    {
      id: "proj_4",
      title: "Sovereign Auth & Payments Engine",
      category: "Fintech Infrastructure",
      client: "Finova Network",
      year: "2026",
      status: "Draft",
      featured: false,
      views: "-",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Showcase Projects</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Curate and manage client case studies displayed on the public portfolio.
          </p>
        </div>

        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          <span>New Project</span>
        </Button>
      </div>

      {/* Projects Table */}
      <div className="glass-panel rounded-xl overflow-hidden border border-zinc-800">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400">Total: {projects.length} entries</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="p-2 h-8 border-zinc-800 text-zinc-400 hover:text-white">
              <Filter className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="divide-y divide-zinc-800/60">
          {projects.map((p) => (
            <div key={p.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/20 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white text-sm">{p.title}</h3>
                  {p.featured && (
                    <Badge variant="outline" className="text-[10px] font-mono border-indigo-500/30 text-indigo-400 bg-indigo-500/10">
                      Featured
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
                  <span>{p.category}</span>
                  <span>•</span>
                  <span>Client: {p.client}</span>
                  <span>•</span>
                  <span>Year: {p.year}</span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right font-mono text-xs text-zinc-400">
                  <span className="text-zinc-500">Impressions: </span>{p.views}
                </div>

                <Badge 
                  variant="outline"
                  className={`text-[11px] font-mono ${
                    p.status === "Published" 
                      ? "border-emerald-400/30 text-emerald-300 bg-emerald-400/10" 
                      : "border-zinc-800 text-zinc-400"
                  }`}
                >
                  {p.status}
                </Badge>

                <Button variant="ghost" size="sm" className="text-xs text-zinc-400 hover:text-indigo-400 transition-colors h-7 px-2">
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
