"use client";

import { toast } from "sonner";
import { Checkbox, Dialog, DialogContent, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/studio-controls";
import React, { useState, useEffect, useMemo } from "react";
import { IconCalendar, IconPlus, IconSearch, IconSend, IconCircleCheck, IconX, IconSparkles, IconChevronDown, IconColumns, IconDotsVertical, IconChevronsLeft, IconChevronLeft, IconChevronRight, IconChevronsRight, IconClock } from "@tabler/icons-react";

import { sendWhatsAppViaN8n } from "@/lib/n8n";
import {
  fetchAppointmentsFromSupabase,
  createAppointmentInSupabase,
  updateAppointmentInSupabase,
  deleteAppointmentInSupabase,
} from "@/lib/supabase-client";

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
  const [currentPage, setCurrentPage] = useState(1);

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
    let active = true;
    void Promise.resolve().then(() => { if (active) setIsMounted(true); });
    fetchAppointmentsFromSupabase(true).then((data) => {
      if (active && data) setAppointments(data as any);
    }).catch(() => { toast.error("Records could not be loaded. Check your connection and reload."); });
    return () => { active = false; };
  }, []);

  const [formData, setFormData] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    service: "1:1 Product Strategy Session",
    scheduled_at: "",
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
      scheduled_at: "",
      status: "confirmed",
      notes: "",
    });
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("create") !== "1") return;
    const timer = window.setTimeout(() => {
      openCreateModal();
      window.history.replaceState({}, "", window.location.pathname);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const openEditModal = (appt: Appointment) => {
    setEditingAppt(appt);
    setFormData({
      client_name: appt.client_name,
      client_email: appt.client_email,
      client_phone: appt.client_phone,
      service: appt.service,
      scheduled_at: new Date(new Date(appt.scheduled_at).getTime() - new Date(appt.scheduled_at).getTimezoneOffset() * 60000).toISOString().slice(0, 16),
      status: appt.status,
      notes: appt.notes || "",
    });
    setIsModalOpen(true);
  };

  const [saving, setSaving] = useState(false);
  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = { ...formData, scheduled_at: new Date(formData.scheduled_at).toISOString() };
      if (editingAppt) {
        const updated = await updateAppointmentInSupabase(editingAppt.id, payload);
        setAppointments(previous => previous.map(item => item.id === editingAppt.id ? { ...item, ...updated } : item));
      } else {
        const created = await createAppointmentInSupabase(payload);
        setAppointments(previous => [created as Appointment, ...previous]);
      }
      setIsModalOpen(false);
      toast.success("Appointment saved");
    } catch { toast.error("Could not save the appointment. Your changes are still here."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this appointment slot?")) {
      try {
        await deleteAppointmentInSupabase(id);
      } catch { toast.error("Could not delete the appointment."); return; }
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      setSelectedRows((prev) => prev.filter((rId) => rId !== id));
    }
  };

  const handleTriggerN8n = async (appt: Appointment) => {
    setN8nStatusMessage(`Triggering n8n WhatsApp workflow for ${appt.client_name}...`);

    const res = await sendWhatsAppViaN8n(appt.id);

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

  const pageSize = Number(rowsPerPage);
  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const pageAppointments = filteredAppointments.slice((page - 1) * pageSize, page * pageSize);
  const visibleColumnCount = 2 + Object.values(visibleColumns).filter(Boolean).length;

  useEffect(() => {
    if (!isModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) setIsModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isModalOpen, saving]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows((current) => [...new Set([...current, ...pageAppointments.map((a) => a.id)])]);
    } else {
      setSelectedRows((current) => current.filter((id) => !pageAppointments.some((appointment) => appointment.id === id)));
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
    pageAppointments.length > 0 && pageAppointments.every((appointment) => selectedRows.includes(appointment.id));

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
              onClick={() => { setActiveTab("all"); setCurrentPage(1); }}
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
              onClick={() => { setActiveTab("confirmed"); setCurrentPage(1); }}
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
              onClick={() => { setActiveTab("pending"); setCurrentPage(1); }}
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
              <input
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Filter bookings..."
                className="h-9 pl-9 pr-3 rounded-full bg-card border-border text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-[#22C55E]"
              />
            </div>

            <details className="studio-table-menu">
              <summary className="h-9 px-3.5 rounded-full bg-card border border-border text-xs font-semibold text-foreground hover:text-accent-foreground hover:bg-accent flex items-center gap-2 transition-all">
                  <IconColumns className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Customize columns</span>
                  <IconChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </summary>
              <div className="studio-table-menu-panel" aria-label="Toggle columns">
                <span>SHOW COLUMNS</span>
                {([
                  ["client", "Client & contact"], ["service", "Service"], ["scheduled", "Scheduled time"], ["status", "Status"], ["whatsapp", "WhatsApp trigger"],
                ] as const).map(([key, label]) => (
                  <label key={key}><input type="checkbox" checked={visibleColumns[key]} onChange={(event) => setVisibleColumns((previous) => ({ ...previous, [key]: event.target.checked }))} />{label}</label>
                ))}
              </div>
            </details>

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
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-10"><Checkbox aria-label="Select all bookings on this page" checked={isAllSelected} onCheckedChange={(checked) => handleSelectAll(checked === true)} /></TableHead>

                {visibleColumns.client && (
                  <TableHead>Client & Contact</TableHead>
                )}
                {visibleColumns.service && (
                  <TableHead>Service</TableHead>
                )}
                {visibleColumns.scheduled && (
                  <TableHead>Scheduled Time</TableHead>
                )}
                {visibleColumns.status && (
                  <TableHead>Status</TableHead>
                )}
                {visibleColumns.whatsapp && (
                  <TableHead className="text-right">WhatsApp Trigger</TableHead>
                )}
                <TableHead aria-label="Booking actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumnCount} className="h-32 text-center text-sm text-muted-foreground">
                    No appointment bookings matching search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                pageAppointments.map((appt) => {
                  const isSelected = selectedRows.includes(appt.id);
                  return (
                    <TableRow key={appt.id} data-state={isSelected ? "selected" : undefined}>
                      <TableCell><Checkbox aria-label={`Select ${appt.client_name}`} checked={isSelected} onCheckedChange={(checked) => handleSelectRow(appt.id, checked === true)} /></TableCell>

                      {visibleColumns.client && (
                        <TableCell><div className="flex min-w-40 flex-col"><strong className="text-sm font-medium">{appt.client_name}</strong><span className="text-xs text-muted-foreground">{appt.client_email}</span><small className="text-xs text-muted-foreground">{appt.client_phone}</small></div></TableCell>
                      )}

                      {visibleColumns.service && (
                        <TableCell>
                          <span className="studio-service-chip">
                            {appt.service}
                          </span>
                        </TableCell>
                      )}

                      {visibleColumns.scheduled && (
                        <TableCell className="whitespace-nowrap text-muted-foreground" suppressHydrationWarning>
                          {formatDate(appt.scheduled_at)}
                        </TableCell>
                      )}

                      {visibleColumns.status && (
                        <TableCell>
                          {appt.status === "confirmed" ? (
                            <span className="studio-status-chip is-confirmed">
                              <IconCircleCheck className="w-3.5 h-3.5 text-[#22C55E] fill-[#22C55E]/20" />
                              <span>Confirmed</span>
                            </span>
                          ) : (
                            <span className={`studio-status-chip ${appt.status === "pending" ? "is-pending" : "is-neutral"}`}>
                              <IconClock className="w-3.5 h-3.5" />
                              <span>{appt.status[0].toUpperCase() + appt.status.slice(1)}</span>
                            </span>
                          )}
                        </TableCell>
                      )}

                      {visibleColumns.whatsapp && (
                        <TableCell className="text-right">
                          <button
                            type="button"
                            onClick={() => handleTriggerN8n(appt)}
                            className={`studio-whatsapp-button ${appt.whatsapp_sent
                              ? "is-sent"
                              : ""
                              }`}
                          >
                            <IconSend size={13} />
                            <span>{appt.whatsapp_sent ? "Sent via n8n" : "Trigger n8n"}</span>
                          </button>
                        </TableCell>
                      )}

                      <TableCell className="text-right">
                        <details className="studio-row-menu">
                          <summary aria-label={`Actions for ${appt.client_name}`}><IconDotsVertical size={17} /></summary>
                          <div className="studio-row-menu-panel">
                            <button onClick={() => openEditModal(appt)}>Edit booking</button>
                            <button onClick={() => void handleTriggerN8n(appt)}>Trigger WhatsApp</button>
                            <button className="is-danger" onClick={() => void handleDelete(appt.id)}>Cancel booking</button>
                          </div>
                        </details>
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
              <select aria-label="Rows per page" value={rowsPerPage} onChange={(event) => { setRowsPerPage(event.target.value); setCurrentPage(1); }} className="studio-native-select">
                <option value="10">10</option>
                <option value="20">20</option>
              </select>
            </div>

            <span className="font-semibold text-foreground">Page {currentPage} of {totalPages}</span>

            <div className="flex items-center gap-1">
              <button aria-label="First page" disabled={currentPage <= 1} onClick={() => setCurrentPage(1)} className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground disabled:opacity-40">
                <IconChevronsLeft className="w-4 h-4" />
              </button>
              <button aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground disabled:opacity-40">
                <IconChevronLeft className="w-4 h-4" />
              </button>
              <button aria-label="Next page" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground disabled:opacity-40">
                <IconChevronRight className="w-4 h-4" />
              </button>
              <button aria-label="Last page" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(totalPages)} className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground disabled:opacity-40">
                <IconChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!saving) setIsModalOpen(open); }}>
          <DialogContent showCloseButton={false} className="studio-appointment-modal" aria-labelledby="appointment-modal-title">
            <div className="studio-modal-heading">
              <div><span>STUDIO / SCHEDULING</span><h2 id="appointment-modal-title"><IconSparkles size={16} />{editingAppt ? "Edit appointment" : "Book an appointment"}</h2></div>
              <button type="button" disabled={saving} aria-label="Close appointment form" onClick={() => setIsModalOpen(false)}><IconX size={18} /></button>
            </div>

          <form onSubmit={handleSaveAppointment} className="space-y-4 text-xs pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-foreground font-semibold">Client Name</label>
                <input
                  required
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="e.g. Jonathan Reed"
                  className="studio-form-control"
                />
              </div>

              <div className="space-y-1">
                <label className="text-foreground font-semibold">Client Phone</label>
                <input
                  required
                  value={formData.client_phone}
                  onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="studio-form-control"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-foreground font-semibold">Client Email</label>
              <input
                type="email"
                required
                value={formData.client_email}
                onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                placeholder="client@company.com"
                className="studio-form-control"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-foreground font-semibold">Service Type</label>
                <select value={formData.service} onChange={(event) => setFormData({ ...formData, service: event.target.value })} className="studio-form-control">
                  <option value="1:1 Product Strategy Session">1:1 Product Strategy Session</option>
                  <option value="Design System Consultation">Design System Consultation</option>
                  <option value="Full Web App Audit">Full Web App Audit</option>
                  <option value="Custom Engineering Sprint">Custom Engineering Sprint</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-foreground font-semibold">Scheduled Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  className="studio-form-control"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-foreground font-semibold">Status</label>
              <select value={formData.status} onChange={(event) => setFormData({ ...formData, status: event.target.value })} className="studio-form-control">
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-foreground font-semibold">Meeting Notes</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Special instructions..."
                className="studio-form-control studio-form-notes"
              />
            </div>

            <div className="studio-modal-actions">
              <button type="button" onClick={() => setIsModalOpen(false)} className="studio-modal-cancel">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="studio-modal-submit">
                {editingAppt ? "Update Booking" : "Save Booking"}
              </button>
            </div>
          </form>
          </DialogContent>
      </Dialog>
    </div>
  );
}
