"use client";

import { toast } from "sonner";
import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconPlus, IconUsers, IconSearch, IconCircleCheck, IconX, IconSparkles, IconChevronDown, IconColumns, IconDotsVertical, IconChevronsLeft, IconChevronLeft, IconChevronRight, IconChevronsRight, IconLoader2, IconMail, IconPhone, IconEye, IconSend } from "@tabler/icons-react";
import {
  fetchClientsFromSupabase,
  createClientInSupabase,
  updateClientInSupabase,
  deleteClientInSupabase,
} from "@/lib/supabase-client";
import { useCurrency } from "@/lib/currency-context";

import {
  Badge, Button, Checkbox, Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DropdownMenu, DropdownMenuCheckboxItem,
  DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuTrigger, Input, Select, SelectContent, SelectItem, SelectTrigger,
  SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/studio-controls";

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: "active" | "lead" | "archived" | string;
  total_spent: number;
  created_at: string;
}

export default function StudioClientsCRUD() {
  const router = useRouter();
  const { formatAmount } = useCurrency();
  const [clients, setClients] = useState<Client[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "lead">("all");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState("10");

  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    company: true,
    contact: true,
    status: true,
    spent: true,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchClientsFromSupabase(true).then((data) => {
      if (!active) return;
      setClients(data ? data as any : []);
      setLoading(false);
    }).catch(() => { toast.error("Records could not be loaded. Check your connection and reload."); setLoading(false); });
    return () => { active = false; };
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    status: "active",
    total_spent: 0,
  });

  const openCreateModal = () => {
    setEditingClient(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      status: "lead",
      total_spent: 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cli: Client) => {
    setEditingClient(cli);
    setFormData({
      name: cli.name,
      email: cli.email,
      phone: cli.phone,
      company: cli.company,
      status: cli.status,
      total_spent: cli.total_spent,
    });
    setIsModalOpen(true);
  };

  const [saving, setSaving] = useState(false);
  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const payload = formData;
    try {
      if (editingClient) {
        const updated = await updateClientInSupabase(editingClient.id, payload);
        setClients(previous => previous.map(item => item.id === editingClient.id ? { ...item, ...updated } : item));
      } else {
        const created = await createClientInSupabase(payload);
        setClients(previous => [created as Client, ...previous]);
      }
      toast.success("Client saved");
      setIsModalOpen(false);
    } catch {
      toast.error("Could not save. Your changes are still here. Check your connection and permissions, then try again.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to remove this client account?")) {
      try {
        await deleteClientInSupabase(id);
      } catch { toast.error("Could not save this change. Check your connection and permissions."); return; }
      setClients((prev) => prev.filter((c) => c.id !== id));
      setSelectedRows((prev) => prev.filter((rId) => rId !== id));
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === "all" || c.status === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [clients, searchQuery, activeTab]);

  const pageCount = Math.max(1, Math.ceil(filteredClients.length / Number(rowsPerPage)));
  const page = Math.min(currentPage, pageCount);
  const pageRows = filteredClients.slice((page - 1) * Number(rowsPerPage), page * Number(rowsPerPage));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(previous => Array.from(new Set([...previous, ...pageRows.map(item => item.id)])));
    } else {
      setSelectedRows(previous => previous.filter(id => !pageRows.some(item => item.id === id)));
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
    pageRows.length > 0 && pageRows.every(item => selectedRows.includes(item.id));

  const tabCounts = useMemo(() => {
    const act = clients.filter((c) => c.status === "active").length;
    const ld = clients.filter((c) => c.status === "lead").length;
    return { all: clients.length, active: act, lead: ld };
  }, [clients]);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pt-2 text-foreground font-sans antialiased">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground flex items-center gap-2.5">
            <IconUsers className="w-6 h-6 text-[#22C55E]" /> Clients
          </h1>
          <p className="text-xs text-muted-foreground font-normal mt-0.5">
            Manage agency accounts, sales leads, and client contact profiles.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="h-11 px-5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-extrabold flex items-center gap-2 shadow-lg transition-all self-start sm:self-auto"
        >
          <IconPlus className="w-4 h-4" />
          <span>Add Client</span>
        </button>
      </div>

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
              <span>All Clients</span>
              <span className="px-1.5 py-0.2 rounded-full bg-zinc-700 text-foreground text-[10px] font-bold">
                {tabCounts.all}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("active")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === "active"
                  ? "bg-accent text-foreground border border-border shadow-md"
                  : "text-muted-foreground hover:text-accent-foreground"
                }`}
            >
              <span>Active</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#22C55E]/20 text-[#4ADE80] text-[10px] font-bold">
                {tabCounts.active}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("lead")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === "lead"
                  ? "bg-accent text-foreground border border-border shadow-md"
                  : "text-muted-foreground hover:text-accent-foreground"
                }`}
            >
              <span>Leads</span>
              <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                {tabCounts.lead}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative w-48">
              <IconSearch className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => (setSearchQuery(e.target.value), setCurrentPage(1))}
                placeholder="Filter clients..."
                className="h-9 pl-9 pr-3 rounded-full bg-card border-border text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-[#22C55E]"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-9 px-3.5 rounded-full bg-card border border-border text-xs font-semibold text-foreground hover:text-accent-foreground hover:bg-accent flex items-center gap-2 transition-all">
                  <IconColumns className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Customize columns</span>
                  <IconChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-muted border-border text-foreground text-xs rounded-xl w-44">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-accent" />
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.name}
                  onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, name: !!v }))}
                >
                  Contact Name
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.company}
                  onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, company: !!v }))}
                >
                  Company
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.contact}
                  onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, contact: !!v }))}
                >
                  Email & IconPhone
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.status}
                  onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, status: !!v }))}
                >
                  Status
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.spent}
                  onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, spent: !!v }))}
                >
                  Total Spent
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={openCreateModal}
              className="h-9 px-4 rounded-full bg-muted hover:bg-accent border border-border text-xs font-bold text-foreground flex items-center gap-1.5 transition-all shadow-md"
            >
              <IconPlus className="w-3.5 h-3.5" />
              <span>Add Client</span>
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

                {visibleColumns.name && (
                  <TableHead className="text-foreground font-extrabold text-xs">Contact Name</TableHead>
                )}
                {visibleColumns.company && (
                  <TableHead className="text-foreground font-extrabold text-xs">Company</TableHead>
                )}
                {visibleColumns.contact && (
                  <TableHead className="text-foreground font-extrabold text-xs">Email & IconPhone</TableHead>
                )}
                {visibleColumns.status && (
                  <TableHead className="text-foreground font-extrabold text-xs">Status</TableHead>
                )}
                {visibleColumns.spent && (
                  <TableHead className="text-foreground font-extrabold text-xs">Total Spent</TableHead>
                )}
                <TableHead className="w-12 text-right text-muted-foreground"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-zinc-800/50">
              {filteredClients.length === 0 ? (
                <TableRow className="hover:bg-transparent border-none">
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    No client accounts matching search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((cli) => {
                  const isSelected = selectedRows.includes(cli.id);
                  return (
                    <TableRow
                      key={cli.id}
                      className={`border-border transition-colors hover:bg-muted/60 ${isSelected ? "bg-muted/70" : ""
                        }`}
                    >
                      <TableCell className="w-10 p-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(c) => handleSelectRow(cli.id, !!c)}
                          className="border-border data-[state=checked]:bg-white data-[state=checked]:text-background"
                        />
                      </TableCell>

                      {visibleColumns.name && (
                        <TableCell className="p-3 text-xs font-bold text-foreground">
                          <Link
                            href={`/clients/${cli.id}`}
                            className="hover:text-[#22C55E] transition-colors flex items-center gap-1.5 group"
                          >
                            <span>{cli.name}</span>
                            <IconEye className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[#22C55E] transition-opacity" />
                          </Link>
                        </TableCell>
                      )}

                      {visibleColumns.company && (
                        <TableCell className="p-3">
                          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold bg-muted border border-border text-foreground">
                            {cli.company}
                          </span>
                        </TableCell>
                      )}

                      {visibleColumns.contact && (
                        <TableCell className="p-3 space-y-1">
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(cli.email)}&su=${encodeURIComponent("Zerocraft Project Update")}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Send Email via Gmail"
                              className="px-2 py-0.5 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-[11px] font-medium transition-colors flex items-center gap-1"
                            >
                              <IconMail className="w-3 h-3 text-purple-400" />
                              <span className="truncate max-w-[130px]">{cli.email}</span>
                            </a>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://wa.me/${cli.phone ? cli.phone.replace(/[^0-9]/g, "") : ""}?text=${encodeURIComponent(`Hello ${cli.name}, regarding your Zerocraft project...`)}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Chat on WhatsApp"
                              className="px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[11px] font-mono transition-colors flex items-center gap-1"
                            >
                              <IconSend className="w-3 h-3 text-[#22C55E]" />
                              <span>{cli.phone || "N/A"}</span>
                            </a>
                            {cli.phone && (
                              <a
                                href={`tel:${cli.phone}`}
                                title="Call Client"
                                className="p-1 rounded-md bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <IconPhone className="w-3 h-3 text-blue-400" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                      )}

                      {visibleColumns.status && (
                        <TableCell className="p-3">
                          {cli.status === "active" ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-muted border border-border text-emerald-400">
                              <IconCircleCheck className="w-3.5 h-3.5 text-[#22C55E] fill-[#22C55E]/20" />
                              <span>Done (Active)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-muted border border-border text-purple-400">
                              <IconLoader2 className="w-3 h-3 text-purple-400 animate-spin" />
                              <span>In Process (Lead)</span>
                            </span>
                          )}
                        </TableCell>
                      )}

                      {visibleColumns.spent && (
                        <TableCell className="p-3 text-xs font-bold text-foreground">
                          {formatAmount(cli.total_spent)}
                        </TableCell>
                      )}

                      <TableCell className="w-12 text-right p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded-lg text-muted-foreground hover:text-accent-foreground hover:bg-accent transition-colors">
                              <IconDotsVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-muted border-border text-foreground text-xs rounded-xl w-52">
                            <DropdownMenuItem
                              onClick={() => router.push(`/clients/${cli.id}`)}
                              className="cursor-pointer flex items-center gap-2 focus:bg-accent text-emerald-400 font-semibold"
                            >
                              <IconEye className="w-3.5 h-3.5 text-[#22C55E]" />
                              View Profile & Timeline
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-accent" />
                            <DropdownMenuItem
                              onClick={() => openEditModal(cli)}
                              className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                            >
                              Edit Profile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-accent" />
                            <DropdownMenuItem
                              onClick={() => handleDelete(cli.id)}
                              className="cursor-pointer text-rose-400 focus:bg-rose-500/10 focus:text-rose-400"
                            >
                              Remove Account
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
            <span>{selectedRows.length} of {filteredClients.length} row(s) selected.</span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Rows per page</span>
              <Select value={rowsPerPage} onValueChange={(val) => val && (setRowsPerPage(val), setCurrentPage(1))}>
                <SelectTrigger className="h-8 w-16 bg-muted border-border text-xs rounded-xl text-foreground">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent align="end" className="bg-muted border-border text-foreground text-xs rounded-xl">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <span className="font-semibold text-foreground">Page {page} of {pageCount}</span>

            <div className="flex items-center gap-1">
              <button aria-label="First page" disabled={page === 1} onClick={() => setCurrentPage(1)} className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground disabled:opacity-40">
                <IconChevronsLeft className="w-4 h-4" />
              </button>
              <button aria-label="Previous page" disabled={page === 1} onClick={() => setCurrentPage(page - 1)} className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground disabled:opacity-40">
                <IconChevronLeft className="w-4 h-4" />
              </button>
              <button aria-label="Next page" disabled={page === pageCount} onClick={() => setCurrentPage(page + 1)} className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground disabled:opacity-40">
                <IconChevronRight className="w-4 h-4" />
              </button>
              <button aria-label="Last page" disabled={page === pageCount} onClick={() => setCurrentPage(pageCount)} className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground disabled:opacity-40">
                <IconChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!saving) setIsModalOpen(open); }}>
        <DialogContent className="bg-background border border-border text-foreground max-w-lg rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <IconSparkles className="w-4 h-4 text-[#22C55E]" />
              {editingClient ? "Edit Client Account" : "Add Client Account"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveClient} className="space-y-4 text-xs pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-foreground font-semibold" htmlFor="clients-name">Contact Name</label>
                <Input id="clients-name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Alex Morgan"
                  className="bg-muted border-border text-foreground focus-visible:ring-[#22C55E] h-10 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-foreground font-semibold" htmlFor="clients-company">Company Name</label>
                <Input id="clients-company"
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="bg-muted border-border text-foreground focus-visible:ring-[#22C55E] h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-foreground font-semibold" htmlFor="clients-email">Email Address</label>
                <Input id="clients-email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-muted border-border text-foreground focus-visible:ring-[#22C55E] h-10 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-foreground font-semibold" htmlFor="clients-phone">IconPhone Number</label>
                <Input id="clients-phone"
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-muted border-border text-foreground focus-visible:ring-[#22C55E] h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-foreground font-semibold">Account Status</label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => val && setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-xl text-xs focus:ring-[#22C55E]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border text-foreground text-xs rounded-xl">
                    <SelectItem value="active">Active Client</SelectItem>
                    <SelectItem value="lead">New Lead</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-foreground font-semibold" htmlFor="clients-total_spent">Total Spent ($)</label>
                <Input id="clients-total_spent"
                  type="number"
                  value={formData.total_spent}
                  onChange={(e) => setFormData({ ...formData, total_spent: Number(e.target.value) })}
                  className="bg-muted border-border text-foreground focus-visible:ring-[#22C55E] h-10 rounded-xl text-xs"
                />
              </div>
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
                type="submit" disabled={saving}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-extrabold text-xs rounded-xl"
              >
                {editingClient ? "Update Account" : "Save Account"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
