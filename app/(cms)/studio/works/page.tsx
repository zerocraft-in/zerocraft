"use client";

import React, { useState, useEffect, useMemo } from "react";
import { IconPlus, IconBriefcase, IconSearch, IconCircleCheck, IconX, IconSparkles, IconChevronDown, IconColumns, IconDotsVertical, IconChevronsLeft, IconChevronLeft, IconChevronRight, IconChevronsRight, IconLoader2, IconStar } from "@tabler/icons-react";
import {
  fetchWorksFromSupabase,
  createWorkInSupabase,
  updateWorkInSupabase,
  deleteWorkInSupabase,
  supabase,
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

interface WorkItem {
  id: string;
  title: string;
  category: string;
  image_url: string;
  client_name: string;
  description: string;
  featured: boolean;
  created_at: string;
}

export default function StudioWorksCRUD() {
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "featured" | "standard">("all");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState("10");

  const [visibleColumns, setVisibleColumns] = useState({
    title: true,
    category: true,
    client: true,
    featured: true,
    status: true,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<WorkItem | null>(null);

  useEffect(() => {
    fetchWorksFromSupabase().then((data) => {
      if (data) {
        setWorks(data as any);
      }
    });
  }, []);

  const [formData, setFormData] = useState({
    title: "",
    category: "Web App Design",
    image_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&fit=crop",
    client_name: "",
    description: "",
    featured: true,
  });

  const openCreateModal = () => {
    setEditingWork(null);
    setFormData({
      title: "",
      category: "Web App Design",
      image_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&fit=crop",
      client_name: "",
      description: "",
      featured: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (work: WorkItem) => {
    setEditingWork(work);
    setFormData({
      title: work.title,
      category: work.category,
      image_url: work.image_url,
      client_name: work.client_name,
      description: work.description,
      featured: work.featured,
    });
    setIsModalOpen(true);
  };

  const handleSaveWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingWork) {
      try {
        const updated = await updateWorkInSupabase(editingWork.id, formData);
        setWorks((prev) =>
          prev.map((w) => (w.id === editingWork.id ? { ...w, ...updated } : w))
        );
      } catch (err) {
        setWorks((prev) =>
          prev.map((w) => (w.id === editingWork.id ? { ...w, ...formData } : w))
        );
      }
    } else {
      try {
        const created = await createWorkInSupabase(formData);
        setWorks((prev) => [created as any, ...prev]);
      } catch (err) {
        const newWork: WorkItem = {
          id: `work-${Date.now()}`,
          ...formData,
          created_at: new Date().toISOString(),
        };
        setWorks((prev) => [newWork, ...prev]);
      }
    }
    setIsModalOpen(false);
  };

  const handleDeleteWork = async (id: string) => {
    if (confirm("Are you sure you want to delete this project?")) {
      try {
        await deleteWorkInSupabase(id);
      } catch (e) {}
      setWorks((prev) => prev.filter((w) => w.id !== id));
      setSelectedRows((prev) => prev.filter((rId) => rId !== id));
    }
  };

  const toggleFeatured = async (id: string) => {
    const current = works.find((w) => w.id === id);
    if (!current) return;
    const newFeatured = !current.featured;

    setWorks((prev) =>
      prev.map((w) => (w.id === id ? { ...w, featured: newFeatured } : w))
    );

    try {
      await updateWorkInSupabase(id, { featured: newFeatured });
    } catch (e) {}
  };

  const filteredWorks = useMemo(() => {
    return works.filter((w) => {
      const matchesSearch =
        w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab =
        activeTab === "all"
          ? true
          : activeTab === "featured"
            ? w.featured
            : !w.featured;
      return matchesSearch && matchesTab;
    });
  }, [works, searchQuery, activeTab]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(filteredWorks.map((w) => w.id));
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
    filteredWorks.length > 0 && selectedRows.length === filteredWorks.length;

  const tabCounts = useMemo(() => {
    const feat = works.filter((w) => w.featured).length;
    const std = works.filter((w) => !w.featured).length;
    return { all: works.length, featured: feat, standard: std };
  }, [works]);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pt-2 text-foreground font-sans antialiased">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground flex items-center gap-2.5">
            <IconBriefcase className="w-6 h-6 text-[#22C55E]" /> Works
          </h1>
          <p className="text-xs text-muted-foreground font-normal mt-0.5">
            Manage portfolio projects, case studies, and studio showcase items.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="h-11 px-5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-extrabold flex items-center gap-2 shadow-lg transition-all self-start sm:self-auto"
        >
          <IconPlus className="w-4 h-4" />
          <span>Add Project</span>
        </button>
      </div>

      {/* Reference-Styled Ultra-Sleek Table Container */}
      <div className=" py-6 bg-background space-y-6">
        {/* Top Header Pill Tabs & Actions Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 bg-card p-1.5 rounded-full border border-border max-w-max">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "all"
                ? "bg-accent text-foreground border border-border shadow-md"
                : "text-muted-foreground hover:text-accent-foreground"
                }`}
            >
              <span>All Works</span>
              <span className="px-1.5 py-0.2 rounded-full bg-zinc-700 text-foreground text-[10px] font-bold">
                {tabCounts.all}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("featured")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === "featured"
                ? "bg-accent text-foreground border border-border shadow-md"
                : "text-muted-foreground hover:text-accent-foreground"
                }`}
            >
              <span>Featured</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                {tabCounts.featured}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("standard")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === "standard"
                ? "bg-accent text-foreground border border-border shadow-md"
                : "text-muted-foreground hover:text-accent-foreground"
                }`}
            >
              <span>Standard</span>
              <span className="px-1.5 py-0.2 rounded-full bg-zinc-700 text-foreground text-[10px] font-bold">
                {tabCounts.standard}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative w-48">
              <IconSearch className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter works..."
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
                  checked={visibleColumns.title}
                  onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, title: !!v }))}
                >
                  Project Title
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.category}
                  onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, category: !!v }))}
                >
                  Category
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.client}
                  onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, client: !!v }))}
                >
                  Client Name
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.status}
                  onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, status: !!v }))}
                >
                  Showcase Status
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={openCreateModal}
              className="h-9 px-4 rounded-full bg-muted hover:bg-accent border border-border text-xs font-bold text-foreground flex items-center gap-1.5 transition-all shadow-md"
            >
              <IconPlus className="w-3.5 h-3.5" />
              <span>Add Project</span>
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

                {visibleColumns.title && (
                  <TableHead className="text-foreground font-extrabold text-xs">Project Title</TableHead>
                )}
                {visibleColumns.category && (
                  <TableHead className="text-foreground font-extrabold text-xs">Category</TableHead>
                )}
                {visibleColumns.client && (
                  <TableHead className="text-foreground font-extrabold text-xs">Client Name</TableHead>
                )}
                {visibleColumns.status && (
                  <TableHead className="text-foreground font-extrabold text-xs">Showcase Status</TableHead>
                )}
                <TableHead className="w-12 text-right text-muted-foreground"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-zinc-800/50">
              {filteredWorks.length === 0 ? (
                <TableRow className="hover:bg-transparent border-none">
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    No portfolio projects matching search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredWorks.map((work) => {
                  const isSelected = selectedRows.includes(work.id);
                  return (
                    <TableRow
                      key={work.id}
                      className={`border-border transition-colors hover:bg-muted/60 ${isSelected ? "bg-muted/70" : ""
                        }`}
                    >
                      <TableCell className="w-10 p-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(c) => handleSelectRow(work.id, !!c)}
                          className="border-border data-[state=checked]:bg-white data-[state=checked]:text-background"
                        />
                      </TableCell>

                      {visibleColumns.title && (
                        <TableCell className="p-3">
                          <div className="font-bold text-foreground max-w-xs sm:max-w-sm truncate text-xs">
                            {work.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                            {work.description.slice(0, 45)}...
                          </div>
                        </TableCell>
                      )}

                      {visibleColumns.category && (
                        <TableCell className="p-3">
                          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold bg-muted border border-border text-foreground">
                            {work.category}
                          </span>
                        </TableCell>
                      )}

                      {visibleColumns.client && (
                        <TableCell className="p-3 text-xs font-semibold text-foreground">
                          {work.client_name}
                        </TableCell>
                      )}

                      {visibleColumns.status && (
                        <TableCell className="p-3">
                          {work.featured ? (
                            <button
                              onClick={() => toggleFeatured(work.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-muted border border-border text-emerald-400 hover:bg-accent transition-colors"
                            >
                              <IconCircleCheck className="w-3.5 h-3.5 text-[#22C55E] fill-[#22C55E]/20" />
                              <span>Done (Featured)</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleFeatured(work.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-muted border border-border text-muted-foreground hover:bg-accent transition-colors"
                            >
                              <IconLoader2 className="w-3 h-3 text-muted-foreground animate-spin" />
                              <span>In Process</span>
                            </button>
                          )}
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
                              onClick={() => openEditModal(work)}
                              className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                            >
                              Edit Project
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toggleFeatured(work.id)}
                              className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                            >
                              Toggle Showcase ({work.featured ? "Standard" : "Feature"})
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-accent" />
                            <DropdownMenuItem
                              onClick={() => handleDeleteWork(work.id)}
                              className="cursor-pointer text-rose-400 focus:bg-rose-500/10 focus:text-rose-400"
                            >
                              Delete Project
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

        {/* Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-muted-foreground pt-2">
          <div>
            <span>{selectedRows.length} of {filteredWorks.length} row(s) selected.</span>
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
              {editingWork ? "Edit Showcase Item" : "Add New Showcase Item"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveWork} className="space-y-4 text-xs pt-2">
            <div className="space-y-1">
              <label className="text-foreground font-semibold">Project Title</label>
              <Input
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Apex AI Workspace"
                className="bg-muted border-border text-foreground placeholder:text-zinc-600 focus-visible:ring-[#22C55E] h-10 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-foreground font-semibold">Category</label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => val && setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-xl text-xs focus:ring-[#22C55E]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border text-foreground text-xs rounded-xl">
                    <SelectItem value="Web App Design">Web App Design</SelectItem>
                    <SelectItem value="SaaS Platform">SaaS Platform</SelectItem>
                    <SelectItem value="Branding & Mobile">Branding & Mobile</SelectItem>
                    <SelectItem value="3D & Motion">3D & Motion</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-foreground font-semibold">Client Name</label>
                <Input
                  required
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="e.g. Vanguard Global"
                  className="bg-muted border-border text-foreground focus-visible:ring-[#22C55E] h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-foreground font-semibold">Image URL</label>
              <Input
                required
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="bg-muted border-border text-foreground focus-visible:ring-[#22C55E] h-10 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-foreground font-semibold">Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Overview of project achievements..."
                className="w-full p-3 rounded-xl bg-muted border border-border text-foreground placeholder-zinc-600 focus:outline-none focus:border-[#22C55E] text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="featuredCheck"
                checked={formData.featured}
                onCheckedChange={(c) => setFormData({ ...formData, featured: !!c })}
                className="border-border data-[state=checked]:bg-[#22C55E] data-[state=checked]:text-background"
              />
              <label htmlFor="featuredCheck" className="text-foreground font-semibold cursor-pointer">
                Feature this project on studio showcase
              </label>
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
                {editingWork ? "Update Project" : "Add Project"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
