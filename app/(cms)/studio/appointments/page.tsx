"use client";

import React, { useState, useEffect, useMemo } from "react";
import { IconCalendar, IconPlus, IconSearch, IconSend, IconCircleCheck, IconX, IconSparkles, IconChevronDown, IconColumns, IconDotsVertical, IconChevronsLeft, IconChevronLeft, IconChevronRight, IconChevronsRight, IconLoader2, IconClock } from "@tabler/icons-react";

import { sendWhatsAppViaN8n } from "@/lib/n8n";
import {
  fetchAppointmentsFromSupabase,
  createAppointmentInSupabase,
  updateAppointmentInSupabase,
  deleteAppointmentInSupabase,
} from "@/lib/supabase-client";

// shadcn UI components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Appointment {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  service: string;
  scheduled_at: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | string;
  notes?: string;
  whatsapp_sent: boolean;
  created_at: string;
}

export default function StudioAppointmentsCRUD() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "confirmed" | "pending">("all");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState("10");

  const [visibleColumns, setVisibleColumns] = useState({
    client: true,
    service: true,
    scheduled: true,
    status: true,
    whatsapp: true,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [n8nStatusMessage, setN8nStatusMessage] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchAppointmentsFromSupabase().then((data) => {
      if (data) setAppointments(data as any);
    });
  }, []);

  const [formData, setFormData] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    service: "1:1 Product Strategy Session",
    scheduled_at: "2026-08-06T14:00",
    status: "confirmed",
    notes: "",
  });

  const openCreateModal = () => {
    setEditingAppt(null);
    setFormData({
      client_name: "",
      client_email: "",
      client_phone: "",
      service: "1:1 Product Strategy Session",
      scheduled_at: "2026-08-06T14:00",
      status: "confirmed",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (appt: Appointment) => {
    setEditingAppt(appt);
    setFormData({
      client_name: appt.client_name,
      client_email: appt.client_email,
      client_phone: appt.client_phone,
      service: appt.service,
      scheduled_at: appt.scheduled_at.slice(0, 16),
      status: appt.status,
      notes: appt.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAppt) {
      try {
        const updated = await updateAppointmentInSupabase(editingAppt.id, formData);
        setAppointments((prev) =>
          prev.map((a) => (a.id === editingAppt.id ? { ...a, ...updated } : a))
        );
      } catch (err) {
        setAppointments((prev) =>
          prev.map((a) => (a.id === editingAppt.id ? { ...a, ...formData } : a))
        );
      }
    } else {
      try {
        const created = await createAppointmentInSupabase(formData);
        setAppointments((prev) => [created as any, ...prev]);
      } catch (err) {
        const newAppt: Appointment = {
          id: `apt-${Date.now()}`,
          ...formData,
          whatsapp_sent: false,
          created_at: new Date().toISOString(),
        };
        setAppointments((prev) => [newAppt, ...prev]);
      }
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this appointment slot?")) {
      try {
        await deleteAppointmentInSupabase(id);
      } catch (e) { }
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      setSelectedRows((prev) => prev.filter((rId) => rId !== id));
    }
  };

  const handleTriggerN8n = async (appt: Appointment) => {
    setN8nStatusMessage(`Triggering n8n WhatsApp workflow for ${appt.client_name}...`);

    const res = await sendWhatsAppViaN8n({
      recipientName: appt.client_name,
      recipientPhone: appt.client_phone,
      recipientEmail: appt.client_email,
      serviceName: appt.service,
      appointmentTime: appt.scheduled_at,
      status: appt.status as any,
      notes: appt.notes,
    });

    if (res.success) {
      setAppointments((prev) =>
        prev.map((a) => (a.id === appt.id ? { ...a, whatsapp_sent: true } : a))
      );
    }

    setN8nStatusMessage(res.message);
    setTimeout(() => setN8nStatusMessage(null), 5000);
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const matchesSearch =
        a.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.client_email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === "all" || a.status === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [appointments, searchQuery, activeTab]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(filteredAppointments.map((a) => a.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRows((prev) => [...prev, id]);
    } else {
      setSelectedRows((prev) => prev.filter((item) => item !== id));
    }
  };

  const isAllSelected =
    filteredAppointments.length > 0 && selectedRows.length === filteredAppointments.length;

  const tabCounts = useMemo(() => {
    const conf = appointments.filter((a) => a.status === "confirmed").length;
    const pend = appointments.filter((a) => a.status === "pending").length;
    return { all: appointments.length, confirmed: conf, pending: pend };
  }, [appointments]);

  const formatDate = (isoString: string) => {
    if (!isMounted) return isoString.replace("T", " ").slice(0, 16);
    try {
      return new Date(isoString).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pt-2 text-foreground font-sans antialiased">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground flex items-center gap-2.5">
            <IconCalendar className="w-6 h-6 text-[#22C55E]" /> Appointments
          </h1>
          <p className="text-xs text-muted-foreground font-normal mt-0.5">
            Schedule studio sessions, product strategy calls, and n8n WhatsApp automations.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="h-11 px-5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-extrabold flex items-center gap-2 shadow-lg transition-all self-start sm:self-auto"
        >
          <IconPlus className="w-4 h-4" />
          <span>Book Slot</span>
        </button>
      </div>

      {/* n8n Status Alert */}
      {n8nStatusMessage && (
        <div className="p-4 rounded-2xl bg-muted border border-[#22C55E]/30 text-foreground text-xs flex items-center justify-between shadow-xl animate-fadeIn">
          <div className="flex items-center gap-2">
            <IconSend className="w-4 h-4 text-[#22C55E] animate-bounce" />
            <span className="font-semibold text-emerald-300">{n8nStatusMessage}</span>
          </div>
          <button onClick={() => setN8nStatusMessage(null)} className="text-muted-foreground hover:text-accent-foreground">
            Dismiss
          </button>
        </div>
      )}

      {/* Reference-Styled Table Container */}
      <div className=" py-6 bg-background space-y-6">
        {/* Top Pill Tabs & Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 bg-card p-1.5 rounded-full border border-border max-w-max">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "all"
                ? "bg-accent text-foreground border border-border shadow-md"
                : "text-muted-foreground hover:text-accent-foreground"
                }`}
            >
              <span>All Bookings</span>
              <span className="px-1.5 py-0.2 rounded-full bg-zinc-700 text-foreground text-[10px] font-bold">
                {tabCounts.all}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("confirmed")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === "confirmed"
                ? "bg-accent text-foreground border border-border shadow-md"
                : "text-muted-foreground hover:text-accent-foreground"
                }`}
            >
              <span>Confirmed</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#22C55E]/20 text-[#4ADE80] text-[10px] font-bold">
                {tabCounts.confirmed}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("pending")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === "pending"
                ? "bg-accent text-foreground border border-border shadow-md"
                : "text-muted-foreground hover:text-accent-foreground"
                }`}
            >
              <span>Pending</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                {tabCounts.pending}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative w-48">
              <IconSearch className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter bookings..."
                className="h-9 pl-9 pr-3 rounded-full bg-card border-border text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-[#22C55E]"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-9 px-3.5 rounded-full bg-card border border-border text-xs font-semibold text-foreground hover:text-accent-foreground hover:bg-accent flex items-center gap-2 transition-all">
                  <IconColumns className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Customize IconColumns</span>
                  <IconChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-muted border-border text-foreground text-xs rounded-xl w-44">
                <DropdownMenuLabel>Toggle IconColumns</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-accent" />
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.client}
                  onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, client: !!v }))}
                >
                  Client & Contact
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.service}
                  onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, service: !!v }))}
                >
                  Service
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.scheduled}
                  onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, scheduled: !!v }))}
                >
                  Scheduled Time
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.status}
                  onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, status: !!v }))}
                >
                  Status
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.whatsapp}
                  onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, whatsapp: !!v }))}
                >
                  n8n WhatsApp
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={openCreateModal}
              className="h-9 px-4 rounded-full bg-muted hover:bg-accent border border-border text-xs font-bold text-foreground flex items-center gap-1.5 transition-all shadow-md"
            >
              <IconPlus className="w-3.5 h-3.5" />
              <span>Book Slot</span>
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="rounded-2xl border border-border overflow-hidden bg-background">
          <Table>
            <TableHeader className="bg-background border-b border-border">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-10 p-3">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    className="border-border data-[state=checked]:bg-white data-[state=checked]:text-background"
                  />
                </TableHead>

                {visibleColumns.client && (
                  <TableHead className="text-foreground font-extrabold text-xs">Client & Contact</TableHead>
                )}
                {visibleColumns.service && (
                  <TableHead className="text-foreground font-extrabold text-xs">Service</TableHead>
                )}
                {visibleColumns.scheduled && (
                  <TableHead className="text-foreground font-extrabold text-xs">Scheduled Time</TableHead>
                )}
                {visibleColumns.status && (
                  <TableHead className="text-foreground font-extrabold text-xs">Status</TableHead>
                )}
                {visibleColumns.whatsapp && (
                  <TableHead className="text-foreground font-extrabold text-xs text-right">n8n WhatsApp Trigger</TableHead>
                )}
                <TableHead className="w-12 text-right text-muted-foreground"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-zinc-800/50">
              {filteredAppointments.length === 0 ? (
                <TableRow className="hover:bg-transparent border-none">
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    No appointment bookings matching search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAppointments.map((appt) => {
                  const isSelected = selectedRows.includes(appt.id);
                  return (
                    <TableRow
                      key={appt.id}
                      className={`border-border transition-colors hover:bg-muted/60 ${isSelected ? "bg-muted/70" : ""
                        }`}
                    >
                      <TableCell className="w-10 p-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(c) => handleSelectRow(appt.id, !!c)}
                          className="border-border data-[state=checked]:bg-white data-[state=checked]:text-background"
                        />
                      </TableCell>

                      {visibleColumns.client && (
                        <TableCell className="p-3">
                          <div className="font-bold text-foreground text-xs">{appt.client_name}</div>
                          <div className="text-[11px] text-muted-foreground">{appt.client_email}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{appt.client_phone}</div>
                        </TableCell>
                      )}

                      {visibleColumns.service && (
                        <TableCell className="p-3">
                          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold bg-muted border border-border text-foreground">
                            {appt.service}
                          </span>
                        </TableCell>
                      )}

                      {visibleColumns.scheduled && (
                        <TableCell className="p-3 text-xs font-semibold text-foreground" suppressHydrationWarning>
                          {formatDate(appt.scheduled_at)}
                        </TableCell>
                      )}

                      {visibleColumns.status && (
                        <TableCell className="p-3">
                          {appt.status === "confirmed" ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-muted border border-border text-emerald-400">
                              <IconCircleCheck className="w-3.5 h-3.5 text-[#22C55E] fill-[#22C55E]/20" />
                              <span>Done (Confirmed)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-muted border border-border text-amber-400">
                              <IconLoader2 className="w-3 h-3 text-amber-400 animate-spin" />
                              <span>In Process (Pending)</span>
                            </span>
                          )}
                        </TableCell>
                      )}

                      {visibleColumns.whatsapp && (
                        <TableCell className="p-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTriggerN8n(appt)}
                            className={`h-8 rounded-full text-[10px] font-bold gap-1.5 border ${appt.whatsapp_sent
                              ? "bg-[#22C55E]/15 border-[#22C55E]/30 text-[#4ADE80] hover:bg-[#22C55E]/25"
                              : "bg-muted border-border text-foreground hover:text-accent-foreground"
                              }`}
                          >
                            <IconSend className="w-3 h-3 text-[#22C55E]" />
                            <span>{appt.whatsapp_sent ? "Sent via n8n" : "Trigger n8n"}</span>
                          </Button>
                        </TableCell>
                      )}

                      <TableCell className="w-12 text-right p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded-lg text-muted-foreground hover:text-accent-foreground hover:bg-accent transition-colors">
                              <IconDotsVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-muted border-border text-foreground text-xs rounded-xl w-44">
                            <DropdownMenuItem
                              onClick={() => openEditModal(appt)}
                              className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                            >
                              Edit Booking
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleTriggerN8n(appt)}
                              className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                            >
                              Trigger n8n WhatsApp
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-accent" />
                            <DropdownMenuItem
                              onClick={() => handleDelete(appt.id)}
                              className="cursor-pointer text-rose-400 focus:bg-rose-500/10 focus:text-rose-400"
                            >
                              Cancel Booking
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-muted-foreground pt-2">
          <div>
            <span>{selectedRows.length} of {filteredAppointments.length} row(s) selected.</span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Rows per page</span>
              <Select value={rowsPerPage} onValueChange={(val) => val && setRowsPerPage(val)}>
                <SelectTrigger className="h-8 w-16 bg-muted border-border text-xs rounded-xl text-foreground">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent align="end" className="bg-muted border-border text-foreground text-xs rounded-xl">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <span className="font-semibold text-foreground">Page 1 of 1</span>

            <div className="flex items-center gap-1">
              <button disabled className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground disabled:opacity-40">
                <IconChevronsLeft className="w-4 h-4" />
              </button>
              <button disabled className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground disabled:opacity-40">
                <IconChevronLeft className="w-4 h-4" />
              </button>
              <button disabled className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground disabled:opacity-40">
                <IconChevronRight className="w-4 h-4" />
              </button>
              <button disabled className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground disabled:opacity-40">
                <IconChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-background border border-border text-foreground max-w-lg rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <IconSparkles className="w-4 h-4 text-[#22C55E]" />
              {editingAppt ? "Edit Appointment Booking" : "Book New Appointment"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveAppointment} className="space-y-4 text-xs pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-foreground font-semibold">Client Name</label>
                <Input
                  required
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="e.g. Jonathan Reed"
                  className="bg-muted border-border text-foreground focus-visible:ring-[#22C55E] h-10 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-foreground font-semibold">Client Phone</label>
                <Input
                  required
                  value={formData.client_phone}
                  onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="bg-muted border-border text-foreground focus-visible:ring-[#22C55E] h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-foreground font-semibold">Client Email</label>
              <Input
                type="email"
                required
                value={formData.client_email}
                onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                placeholder="client@company.com"
                className="bg-muted border-border text-foreground focus-visible:ring-[#22C55E] h-10 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-foreground font-semibold">Service Type</label>
                <Select
                  value={formData.service}
                  onValueChange={(val) => val && setFormData({ ...formData, service: val })}
                >
                  <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-xl text-xs focus:ring-[#22C55E]">
                    <SelectValue placeholder="Service" />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border text-foreground text-xs rounded-xl">
                    <SelectItem value="1:1 Product Strategy Session">1:1 Product Strategy Session</SelectItem>
                    <SelectItem value="Design System Consultation">Design System Consultation</SelectItem>
                    <SelectItem value="Full Web App Audit">Full Web App Audit</SelectItem>
                    <SelectItem value="Custom Engineering Sprint">Custom Engineering Sprint</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-foreground font-semibold">Scheduled Date & Time</label>
                <Input
                  type="datetime-local"
                  required
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  className="bg-muted border-border text-foreground focus-visible:ring-[#22C55E] h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-foreground font-semibold">Status</label>
              <Select
                value={formData.status}
                onValueChange={(val) => val && setFormData({ ...formData, status: val })}
              >
                <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-xl text-xs focus:ring-[#22C55E]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-muted border-border text-foreground text-xs rounded-xl">
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-foreground font-semibold">Meeting Notes</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Special instructions..."
                className="w-full p-3 rounded-xl bg-muted border border-border text-foreground placeholder-zinc-600 focus:outline-none focus:border-[#22C55E] text-xs"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-accent-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-extrabold text-xs rounded-xl"
              >
                {editingAppt ? "Update Booking" : "Save Booking"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
