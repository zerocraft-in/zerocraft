import type { Metadata } from "next";
import "./studio.css";
import Link from "next/link";
import { 
  LayoutDashboard, 
  FolderKanban, 
  Inbox, 
  Settings, 
  ExternalLink, 
  Terminal, 
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@zerocraft/ui/components/badge";

export const metadata: Metadata = {
  title: "ZEROCRAFT STUDIO | Management Console",
  description: "Private operations, client inquiries, showcase curation, and Supabase database governance.",
};

export default function StudioRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="studio-body min-h-screen bg-[#090a0f] text-[#f3f4f6] antialiased selection:bg-indigo-500 selection:text-white">
        <div className="min-h-screen bg-[#090a0f] flex text-zinc-100 antialiased">
          {/* Sidebar Navigation */}
          <aside className="w-64 border-r border-zinc-800/80 bg-[#0c0e14] flex flex-col justify-between shrink-0">
            <div>
              {/* Logo & Workspace Brand */}
              <div className="h-16 border-b border-zinc-800/80 px-6 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                    Z
                  </div>
                  <span className="font-semibold text-sm tracking-wide text-zinc-200">
                    ZEROCRAFT <span className="text-indigo-400 font-mono text-[10px]">STUDIO</span>
                  </span>
                </Link>
                <Badge variant="outline" className="text-[10px] font-mono border-indigo-500/30 text-indigo-400 bg-indigo-500/10">
                  v1.0
                </Badge>
              </div>

              {/* Navigation Links */}
              <div className="p-4 space-y-1">
                <div className="px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                  Workspace
                </div>
                <Link
                  href="/studio"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-all"
                >
                  <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                  <span>Overview</span>
                </Link>
                <Link
                  href="/studio/projects"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-all"
                >
                  <FolderKanban className="w-4 h-4 text-emerald-400" />
                  <span>Showcase Projects</span>
                </Link>
                <Link
                  href="/studio/inquiries"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-all"
                >
                  <Inbox className="w-4 h-4 text-amber-400" />
                  <div className="flex-1 flex items-center justify-between">
                    <span>Client Inquiries</span>
                    <Badge variant="outline" className="text-[9px] font-mono border-amber-400/30 text-amber-300 bg-amber-400/10">
                      New
                    </Badge>
                  </div>
                </Link>
              </div>

              <div className="p-4 space-y-1">
                <div className="px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                  System
                </div>
                <Link
                  href="/studio/settings"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-all"
                >
                  <Settings className="w-4 h-4 text-zinc-400" />
                  <span>Supabase & API</span>
                </Link>
              </div>
            </div>

            {/* Backend / Session Footer */}
            <div className="p-4 border-t border-zinc-800/80 space-y-3">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-zinc-900/60 rounded-lg border border-zinc-800">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="text-[11px] truncate">
                  <p className="text-zinc-300 font-medium">Supabase Connected</p>
                  <p className="text-zinc-500 font-mono text-[10px]">Shared @zerocraft/ui</p>
                </div>
              </div>

              <Link
                href="/"
                className="flex items-center justify-between px-3 py-2 text-xs font-mono text-zinc-400 hover:text-white hover:bg-zinc-800/40 rounded-lg transition-all"
              >
                <span>Return to Portfolio</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top bar */}
            <header className="h-16 border-b border-zinc-800/80 bg-[#090a0f]/80 backdrop-blur-md px-8 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                <span>zerocraft-studio</span>
                <span className="text-zinc-600">/</span>
                <span className="text-zinc-300">private-dashboard</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono text-zinc-400">Tailwind & UI Active</span>
                </div>
              </div>
            </header>

            {/* Page Content */}
            <main className="flex-1 overflow-y-auto p-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
