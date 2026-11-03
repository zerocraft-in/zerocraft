import { getStudioSupabaseConfig } from "@/lib/supabase";
import { ShieldCheck, Database, Key, Server, Terminal, Lock } from "lucide-react";

export default function SettingsDashboard() {
  const supabaseConfig = getStudioSupabaseConfig();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="pb-6 border-b border-zinc-800">
        <h1 className="text-2xl font-bold text-white tracking-tight">Supabase & Infrastructure</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Review connection configuration to your existing ZeroCraft Supabase backend.
        </p>
      </div>

      <div className="space-y-6">
        {/* Supabase Connection Details */}
        <div className="glass-panel p-6 rounded-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Active Supabase Connection</h2>
              <p className="text-xs text-zinc-400">Integrated through <code className="text-indigo-400">@zerocraft/supabase</code> package</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 font-mono text-xs">
            <div className="bg-zinc-900/60 p-4 rounded-lg border border-zinc-800 space-y-1">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" /> Project URL
              </span>
              <p className="text-zinc-200 break-all">{supabaseConfig.url}</p>
            </div>

            <div className="bg-zinc-900/60 p-4 rounded-lg border border-zinc-800 space-y-1">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" /> Publishable / Anon Key
              </span>
              <p className="text-zinc-400 break-all">{supabaseConfig.key.substring(0, 32)}••••••••••••••••</p>
            </div>

            <div className="bg-zinc-900/60 p-4 rounded-lg border border-zinc-800 space-y-1">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Storefront ID
              </span>
              <p className="text-indigo-400">{supabaseConfig.storeId}</p>
            </div>
          </div>
        </div>

        {/* Security & Access Policy Info */}
        <div className="glass-panel p-6 rounded-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Security & Row Level Security (RLS)</h2>
              <p className="text-xs text-zinc-400">All queries route through authenticated Supabase clients</p>
            </div>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            The studio application uses SSR cookies and Supabase Auth with Row Level Security. Public visitors can view active showcases and submit client inquiries, while write operations are restricted to verified staff sessions.
          </p>
        </div>
      </div>
    </div>
  );
}
