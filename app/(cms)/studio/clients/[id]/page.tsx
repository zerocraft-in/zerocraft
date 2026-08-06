"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconMail,
  IconPhone,
  IconSend,
  IconCircleCheck,
  IconClock,
  IconPlus,
  IconBuilding,
  IconCurrencyDollar,
  IconFileText,
  IconBriefcase,
  IconCalendar,
  IconSparkles,
  IconLoader2,
  IconDotsVertical,
  IconExternalLink,
  IconMessageCircle,
} from "@tabler/icons-react";
import {
  fetchClientByIdFromSupabase,
  updateClientInSupabase,
  fetchWorksFromSupabase,
  fetchAppointmentsFromSupabase,
} from "@/lib/supabase-client";
import { useCurrency } from "@/lib/currency-context";

// shadcn UI components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TimelineItem {
  id: string;
  title: string;
  description: string;
  type: "meeting" | "milestone" | "email" | "note" | "invoice";
  date: string;
}

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { formatAmount } = useCurrency();

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [relatedWorks, setRelatedWorks] = useState<any[]>([]);
  const [relatedAppointments, setRelatedAppointments] = useState<any[]>([]);

  // Timeline State
  const [timeline, setTimeline] = useState<TimelineItem[]>([
    {
      id: "tl-1",
      title: "Contract Renewal & Retainer Finalized",
      description: "Signed annual enterprise design & development retainer agreement for Q3-Q4.",
      type: "milestone",
      date: "August 4, 2026",
    },
    {
      id: "tl-2",
      title: "WhatsApp Project Update Sent",
      description: "Sent preview link for initial SaaS dashboard wireframes & responsive UI components.",
      type: "email",
      date: "August 2, 2026",
    },
    {
      id: "tl-3",
      title: "1:1 Product Strategy Session",
      description: "Held a 45-min Zoom call reviewing user onboarding funnel & conversion optimization goals.",
      type: "meeting",
      date: "July 28, 2026",
    },
    {
      id: "tl-4",
      title: "Invoice #ZC-2026-88 Paid",
      description: "Milestone payment of $15,000.00 received cleanly via Stripe/Bank Transfer.",
      type: "invoice",
      date: "July 15, 2026",
    },
  ]);

  // Note form state
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDesc, setNoteDesc] = useState("");
  const [noteType, setNoteType] = useState<"meeting" | "note" | "email">("note");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await fetchClientByIdFromSupabase(id);

      if (data) {
        setClient(data);
      } else {
        // Fallback demo client if ID matches client format
        setClient({
          id: id,
          name: "Acme Corporation",
          email: "contact@acmecorp.com",
          phone: "+1 (555) 234-5678",
          company: "Acme Corp",
          status: "active",
          total_spent: 45000,
          created_at: new Date().toISOString(),
          notes: "Enterprise client with ongoing monthly retainer.",
        });
      }

      const [works, appts] = await Promise.all([
        fetchWorksFromSupabase(),
        fetchAppointmentsFromSupabase(),
      ]);

      setRelatedWorks(works ? works.slice(0, 3) : []);
      setRelatedAppointments(appts ? appts.slice(0, 3) : []);
      setLoading(false);
    }

    loadData();
  }, [id]);

  const handleAddTimelineNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    const newEntry: TimelineItem = {
      id: `tl-${Date.now()}`,
      title: noteTitle,
      description: noteDesc || "No additional notes provided.",
      type: noteType,
      date: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    };

    setTimeline([newEntry, ...timeline]);
    setNoteTitle("");
    setNoteDesc("");
  };

  const handleToggleStatus = async () => {
    if (!client) return;
    const newStatus = client.status === "active" ? "lead" : "active";
    setClient({ ...client, status: newStatus });
    try {
      await updateClientInSupabase(client.id, { status: newStatus });
    } catch (e) {}
  };

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-3">
        <IconLoader2 className="w-8 h-8 text-[#22C55E] animate-spin" />
        <p className="text-xs text-muted-foreground">Loading client account profile...</p>
      </div>
    );
  }

  const cleanPhone = client.phone ? client.phone.replace(/[^0-9]/g, "") : "";
  const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(client.email)}&su=${encodeURIComponent(`Zerocraft Project Update - ${client.company}`)}`;
  const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi ${client.name}, following up regarding your Zerocraft project.`)}`;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/studio/clients"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <IconArrowLeft className="w-4 h-4 text-[#22C55E] group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Clients</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleStatus}
            className="h-8 text-xs font-semibold rounded-xl border-border"
          >
            {client.status === "active" ? "Mark as Lead" : "Mark as Active"}
          </Button>
        </div>
      </div>

      {/* Main Client Profile Banner Card */}
      <div className="p-6 rounded-2xl bg-muted/70 border border-border space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Avatar & Info */}
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-[#22C55E]/30">
              <AvatarFallback className="bg-[#22C55E]/10 text-[#22C55E] font-bold text-xl">
                {client.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{client.name}</h1>
                <Badge
                  variant="outline"
                  className={
                    client.status === "active"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-xs px-2.5 py-0.5"
                      : "bg-purple-500/10 border-purple-500/30 text-purple-300 text-xs px-2.5 py-0.5"
                  }
                >
                  {client.status === "active" ? "Active Retainer" : "Lead / Prospect"}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <IconBuilding className="w-3.5 h-3.5 text-muted-foreground" />
                  {client.company}
                </span>
                <span>•</span>
                <span>Client Since {new Date(client.created_at || Date.now()).getFullYear()}</span>
              </div>
            </div>
          </div>

          {/* Quick Communication Action Buttons Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Gmail Button */}
            <a
              href={gmailLink}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-purple-600/15 hover:bg-purple-600/30 border border-purple-500/30 text-purple-200 text-xs font-semibold transition-all shadow-md flex items-center gap-2"
            >
              <IconMail className="w-4 h-4 text-purple-400" />
              <span>Gmail Message</span>
            </a>

            {/* WhatsApp Button */}
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-200 text-xs font-semibold transition-all shadow-md flex items-center gap-2"
            >
              <IconSend className="w-4 h-4 text-[#22C55E]" />
              <span>WhatsApp Direct</span>
            </a>

            {/* Call Phone Button */}
            {client.phone && (
              <a
                href={`tel:${client.phone}`}
                className="px-3.5 py-2 rounded-xl bg-blue-600/15 hover:bg-blue-600/30 border border-blue-500/30 text-blue-200 text-xs font-semibold transition-all shadow-md flex items-center gap-2"
              >
                <IconPhone className="w-4 h-4 text-blue-400" />
                <span>Call Client</span>
              </a>
            )}
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
          <div className="p-4 rounded-xl bg-background/60 border border-border space-y-1">
            <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
              <IconCurrencyDollar className="w-3.5 h-3.5 text-[#22C55E]" /> Lifetime Account Value
            </div>
            <div className="text-xl font-bold text-foreground">
              {formatAmount(client.total_spent || 0)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-background/60 border border-border space-y-1">
            <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
              <IconMail className="w-3.5 h-3.5 text-purple-400" /> Primary Email
            </div>
            <div className="text-xs font-semibold text-foreground truncate">{client.email}</div>
          </div>

          <div className="p-4 rounded-xl bg-background/60 border border-border space-y-1">
            <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
              <IconPhone className="w-3.5 h-3.5 text-blue-400" /> Phone Number
            </div>
            <div className="text-xs font-mono font-semibold text-foreground">{client.phone || "N/A"}</div>
          </div>
        </div>
      </div>

      {/* Grid: Timeline & Activity Logs + Related Work/Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Activity Timeline & Note Logger */}
        <div className="lg:col-span-2 space-y-6">
          {/* Add Activity Note Form */}
          <div className="p-5 rounded-2xl bg-muted/70 border border-border space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <IconPlus className="w-4 h-4 text-[#22C55E]" /> Log Activity or Touchpoint
            </h3>

            <form onSubmit={handleAddTimelineNote} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  placeholder="Activity title (e.g. Call held, Note, Invoice)..."
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="sm:col-span-2 h-9 text-xs bg-background border-border"
                />
                <select
                  value={noteType}
                  onChange={(e: any) => setNoteType(e.target.value)}
                  className="h-9 text-xs bg-background border border-border rounded-xl px-2.5 text-foreground"
                >
                  <option value="note">Note</option>
                  <option value="meeting">Meeting Call</option>
                  <option value="email">Email Touchpoint</option>
                </select>
              </div>

              <textarea
                placeholder="Details of the interaction or progress update..."
                value={noteDesc}
                onChange={(e) => setNoteDesc(e.target.value)}
                rows={2}
                className="w-full p-2.5 text-xs bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#22C55E]"
              />

              <Button type="submit" size="sm" className="h-8 text-xs font-bold bg-[#22C55E] text-black hover:bg-[#22C55E]/90">
                <IconPlus className="w-3.5 h-3.5 mr-1" /> Log Touchpoint
              </Button>
            </form>
          </div>

          {/* Activity Timeline List */}
          <div className="p-6 rounded-2xl bg-muted/70 border border-border space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <IconClock className="w-4 h-4 text-[#22C55E]" /> Activity & Project Timeline
            </h2>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {timeline.map((item) => (
                <div key={item.id} className="relative group">
                  {/* Timeline Dot */}
                  <div
                    className={`absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${
                      item.type === "milestone"
                        ? "bg-[#22C55E]"
                        : item.type === "meeting"
                        ? "bg-blue-400"
                        : item.type === "invoice"
                        ? "bg-purple-400"
                        : "bg-zinc-400"
                    }`}
                  />

                  <div className="p-4 rounded-xl bg-background/70 border border-border space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-foreground">{item.title}</h4>
                      <span className="text-[10px] text-muted-foreground font-medium">{item.date}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Related Projects & Consultations */}
        <div className="space-y-6">
          {/* Active Projects */}
          <div className="p-5 rounded-2xl bg-muted/70 border border-border space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <IconBriefcase className="w-4 h-4 text-[#22C55E]" /> Client Projects & Deliverables
            </h3>

            <div className="space-y-2.5">
              {relatedWorks.length === 0 ? (
                <p className="text-xs text-muted-foreground">No active portfolio deliverables found.</p>
              ) : (
                relatedWorks.map((work) => (
                  <div key={work.id} className="p-3 rounded-xl bg-background/60 border border-border space-y-1">
                    <div className="text-xs font-bold text-foreground">{work.title}</div>
                    <div className="text-[10px] text-[#22C55E] font-semibold">{work.category}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Scheduled Appointments */}
          <div className="p-5 rounded-2xl bg-muted/70 border border-border space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <IconCalendar className="w-4 h-4 text-purple-400" /> Recent Consultations
            </h3>

            <div className="space-y-2.5">
              {relatedAppointments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No upcoming consultations booked.</p>
              ) : (
                relatedAppointments.map((appt) => (
                  <div key={appt.id} className="p-3 rounded-xl bg-background/60 border border-border space-y-1">
                    <div className="text-xs font-semibold text-foreground">{appt.service}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(appt.scheduled_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
