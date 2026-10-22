"use client";

import { toast } from "@/lib/toast";
import React, { useState, useEffect, useMemo } from "react";
import {
  IconPlus,
  IconBriefcase,
  IconSearch,
  IconCircleCheck,
  IconX,
  IconSparkles,
  IconChevronDown,
  IconColumns,
  IconDotsVertical,
  IconTrash,
  IconChevronsLeft,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsRight,
  IconLoader2,
  IconStar,
} from "@tabler/icons-react";
import {
  fetchWorksFromSupabase,
  createWorkInSupabase,
  updateWorkInSupabase,
  deleteWorkInSupabase,
  supabase,
} from "@/lib/supabase-client";

import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/studio-controls";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
interface WorkItem {
  id: string;
  title: string;
  category: string;
  image_url: string;
  client_name: string;
  description: string;
  featured: boolean;
  status: "published" | "draft" | "archived";
  created_at: string;
}

type WorkFormData = Omit<WorkItem, "id" | "created_at">;

export default function StudioWorksCRUD() {
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "featured" | "standard">(
    "all",
  );
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
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
    fetchWorksFromSupabase(true)
      .then((data) => {
        if (data) {
          setWorks(data as any);
        }
      })
      .catch(() => {
        toast.error(
          "Records could not be loaded. Check your connection and reload.",
        );
      });
  }, []);

  const [formData, setFormData] = useState<WorkFormData>({
    title: "",
    category: "Web App Design",
    image_url:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&fit=crop",
    client_name: "",
    description: "",
    featured: true,
    status: "draft" as const,
  });

  const openCreateModal = () => {
    setEditingWork(null);
    setFormData({
      title: "",
      category: "Web App Design",
      image_url:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&fit=crop",
      client_name: "",
      description: "",
      featured: true,
      status: "draft",
    });
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("create") !== "1")
      return;
    const timer = window.setTimeout(() => {
      openCreateModal();
      window.history.replaceState({}, "", window.location.pathname);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const openEditModal = (work: WorkItem) => {
    setEditingWork(work);
    setFormData({
      title: work.title,
      category: work.category,
      image_url: work.image_url,
      client_name: work.client_name,
      description: work.description,
      featured: work.featured,
      status: work.status,
    });
    setIsModalOpen(true);
  };

  const [saving, setSaving] = useState(false);
  const handleSaveWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const payload = formData;
    try {
      if (editingWork) {
        const updated = await updateWorkInSupabase(editingWork.id, payload);
        setWorks((previous) =>
          previous.map((item) =>
            item.id === editingWork.id ? { ...item, ...updated } : item,
          ),
        );
      } else {
        const created = await createWorkInSupabase(payload);
        setWorks((previous) => [created as WorkItem, ...previous]);
      }
      toast.success("Work saved");
      setIsModalOpen(false);
    } catch {
      toast.error(
        "Could not save. Your changes are still here. Check your connection and permissions, then try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWork = async (id: string) => {
    if (confirm("Are you sure you want to delete this project?")) {
      try {
        await deleteWorkInSupabase(id);
      } catch {
        toast.error(
          "Could not save this change. Check your connection and permissions.",
        );
        return;
      }
      setWorks((prev) => prev.filter((w) => w.id !== id));
      setSelectedRows((prev) => prev.filter((rId) => rId !== id));
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedRows];
    if (
      !ids.length ||
      !confirm(`Delete ${ids.length} selected project(s)? This cannot be undone.`)
    ) {
      return;
    }

    setBulkActionLoading(true);
    const results = await Promise.allSettled(ids.map(deleteWorkInSupabase));
    const deletedIds = ids.filter(
      (_, index) => results[index].status === "fulfilled",
    );
    const failedCount = ids.length - deletedIds.length;

    setWorks((previous) =>
      previous.filter((work) => !deletedIds.includes(work.id)),
    );
    setSelectedRows((previous) =>
      previous.filter((id) => !deletedIds.includes(id)),
    );
    if (failedCount) {
      toast.error(
        `${deletedIds.length} project(s) deleted; ${failedCount} could not be deleted.`,
      );
    } else {
      toast.success(`${deletedIds.length} project(s) deleted`);
    }
    setBulkActionLoading(false);
  };

  const handleBulkUpdate = async (updates: Partial<WorkItem>, label: string) => {
    const ids = [...selectedRows];
    if (!ids.length) return;

    setBulkActionLoading(true);
    const results = await Promise.allSettled(
      ids.map((id) => updateWorkInSupabase(id, updates)),
    );
    const succeededIds = ids.filter(
      (_, index) => results[index].status === "fulfilled",
    );
    const failedCount = ids.length - succeededIds.length;

    setWorks((previous) =>
      previous.map((work) =>
        succeededIds.includes(work.id) ? { ...work, ...updates } : work,
      ),
    );
    setSelectedRows((previous) =>
      previous.filter((id) => !succeededIds.includes(id)),
    );
    if (failedCount) {
      toast.error(
        `${succeededIds.length} project(s) updated; ${failedCount} could not be updated.`,
      );
    } else {
      toast.success(`${succeededIds.length} project(s) ${label}`);
    }
    setBulkActionLoading(false);
  };

  const toggleFeatured = async (id: string) => {
    const current = works.find((w) => w.id === id);
    if (!current) return;
    const newFeatured = !current.featured;

    try {
      await updateWorkInSupabase(id, { featured: newFeatured });
      setWorks((previous) =>
        previous.map((work) =>
          work.id === id ? { ...work, featured: newFeatured } : work,
        ),
      );
    } catch {
      toast.error("Could not update featured status.");
    }
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

  const pageCount = Math.max(
    1,
    Math.ceil(filteredWorks.length / Number(rowsPerPage)),
  );
  const page = Math.min(currentPage, pageCount);
  const pageRows = filteredWorks.slice(
    (page - 1) * Number(rowsPerPage),
    page * Number(rowsPerPage),
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows((previous) =>
        Array.from(new Set([...previous, ...pageRows.map((item) => item.id)])),
      );
    } else {
      setSelectedRows((previous) =>
        previous.filter((id) => !pageRows.some((item) => item.id === id)),
      );
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRows((prev) =>
        prev.includes(id) ? prev : [...prev, id],
      );
    } else {
      setSelectedRows((prev) => prev.filter((item) => item !== id));
    }
  };

  const isAllSelected =
    pageRows.length > 0 &&
    pageRows.every((item) => selectedRows.includes(item.id));

  const tabCounts = useMemo(() => {
    const feat = works.filter((w) => w.featured).length;
    const std = works.filter((w) => !w.featured).length;
    return { all: works.length, featured: feat, standard: std };
  }, [works]);
  const selectedWorksAreFeatured =
    selectedRows.length > 0 &&
    selectedRows.every((id) => works.find((work) => work.id === id)?.featured);

  return (
    <div className="space-y-6 pt-2 font-sans text-foreground antialiased">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <IconBriefcase className="size-5 text-muted-foreground" /> Works
          </h1>
          <p className="text-xs text-muted-foreground font-normal mt-0.5">
            Manage portfolio projects, case studies, and studio showcase items.
          </p>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={openCreateModal}
          className="rounded-xl self-start sm:self-auto"
        >
          <IconPlus className="w-4 h-4" />
          <span>New project</span>
        </Button>
      </div>

      {/* Reference-Styled Ultra-Sleek Table Container */}
      <div className="space-y-4">
        {/* Top Header Pill Tabs & Actions Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value as typeof activeTab);
              setCurrentPage(1);
            }}
          >
            <TabsList className="h-9 rounded-xl p-1">
              <TabsTrigger value="all" className="rounded-lg">
                All works{" "}
                <span className="ml-1 text-xs text-muted-foreground">
                  {tabCounts.all}
                </span>
              </TabsTrigger>
              <TabsTrigger value="featured">
                Featured{" "}
                <span className="ml-1 text-xs text-muted-foreground">
                  {tabCounts.featured}
                </span>
              </TabsTrigger>
              <TabsTrigger value="standard">
                Standard{" "}
                <span className="ml-1 text-xs text-muted-foreground">
                  {tabCounts.standard}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2.5">
            <Field className="max-w-sm">
              <InputGroup className="h-9 rounded-xl">
                <InputGroupInput
                  id="inline-start-input"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => (
                    setSearchQuery(e.target.value),
                    setCurrentPage(1)
                  )}
                />
                <InputGroupAddon align="inline-start">
                  <IconSearch className="text-muted-foreground" />
                </InputGroupAddon>
              </InputGroup>
            </Field>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" className="rounded-xl">
                  <IconColumns className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Customize columns</span>
                  <IconChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-accent" />
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.title}
                  onCheckedChange={(v) =>
                    setVisibleColumns((p) => ({ ...p, title: !!v }))
                  }
                >
                  Project Title
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.category}
                  onCheckedChange={(v) =>
                    setVisibleColumns((p) => ({ ...p, category: !!v }))
                  }
                >
                  Category
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.client}
                  onCheckedChange={(v) =>
                    setVisibleColumns((p) => ({ ...p, client: !!v }))
                  }
                >
                  Client Name
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.status}
                  onCheckedChange={(v) =>
                    setVisibleColumns((p) => ({ ...p, status: !!v }))
                  }
                >
                  Showcase Status
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {selectedRows.length > 0 && (
          <div
            role="toolbar"
            aria-label="Bulk actions"
            className="fixed bottom-4 left-1/2 z-50 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-nowrap items-center gap-1 overflow-x-auto rounded-xl border border-border bg-background/95 p-2 shadow-xl backdrop-blur"
          >
            <span className="flex shrink-0 items-center gap-2 px-2 text-xs font-medium text-foreground">
              <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                {selectedRows.length}
              </span>
              Selected
            </span>
            <span aria-hidden="true" className="mx-1 h-6 shrink-0 border-l border-border" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={bulkActionLoading}
                  className="h-8 shrink-0 rounded-lg"
                >
                  Status
                  <IconChevronDown className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Set status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(["published", "draft", "archived"] as const).map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() =>
                      void handleBulkUpdate({ status }, `set to ${status}`)
                    }
                  >
                    {status[0].toUpperCase() + status.slice(1)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <label className="flex h-8 shrink-0 items-center gap-2 rounded-lg px-2 text-xs font-medium text-foreground">
              <Switch
                checked={selectedWorksAreFeatured}
                disabled={bulkActionLoading}
                onCheckedChange={(checked) =>
                  void handleBulkUpdate(
                    { featured: checked },
                    checked ? "featured" : "unfeatured",
                  )
                }
                aria-label="Feature selected projects"
                size="sm"
              />
              Featured
            </label>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={bulkActionLoading}
              onClick={() => void handleBulkDelete()}
              aria-label="Delete selected projects"
              title="Delete selected projects"
              className="shrink-0 rounded-lg text-destructive hover:text-destructive"
            >
              <IconTrash className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={bulkActionLoading}
              onClick={() => setSelectedRows([])}
              aria-label="Clear selection"
              className="size-8 shrink-0 rounded-lg px-0"
            >
              <IconX className="size-4" />
            </Button>
          </div>
        )}

        {/* Table View */}
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-10 p-3">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    className="border-border data-[state=checked]:bg-white data-[state=checked]:text-background"
                  />
                </TableHead>

                {visibleColumns.title && (
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Project title
                  </TableHead>
                )}
                {visibleColumns.category && (
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Category
                  </TableHead>
                )}
                {visibleColumns.client && (
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Client
                  </TableHead>
                )}
                {visibleColumns.status && (
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Status
                  </TableHead>
                )}
                <TableHead className="w-12 text-right text-muted-foreground"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {filteredWorks.length === 0 ? (
                <TableRow className="hover:bg-transparent border-none">
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-xs text-muted-foreground"
                  >
                    No portfolio projects matching search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((work) => {
                  const isSelected = selectedRows.includes(work.id);
                  return (
                    <TableRow
                      key={work.id}
                      className={`border-border transition-colors hover:bg-muted/60 ${
                        isSelected ? "bg-muted/70" : ""
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
                          <div className="max-w-xs truncate text-sm font-medium text-foreground sm:max-w-sm">
                            {work.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                            {work.description.slice(0, 45)}...
                          </div>
                        </TableCell>
                      )}

                      {visibleColumns.category && (
                        <TableCell className="p-3">
                          <span className="inline-flex rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-foreground">
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
                              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                            >
                              <IconCircleCheck className="size-3.5 text-emerald-600" />
                              <span>Featured</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleFeatured(work.id)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
                            >
                              <IconLoader2 className="w-3 h-3 text-muted-foreground animate-spin" />
                              <span>Standard</span>
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
                          <DropdownMenuContent
                            align="end"
                            className="bg-muted border-border text-foreground text-xs rounded-xl w-44"
                          >
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
                              Toggle Showcase (
                              {work.featured ? "Standard" : "Feature"})
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
            <span>
              {selectedRows.length} of {filteredWorks.length} row(s) selected.
            </span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Rows per page</span>
              <Select
                value={rowsPerPage}
                onValueChange={(val) =>
                  val && (setRowsPerPage(val), setCurrentPage(1))
                }
              >
                <SelectTrigger className="h-8 w-16 bg-muted border-border text-xs rounded-xl text-foreground">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent
                  align="start"
                  className="bg-muted border-border text-foreground text-xs rounded-xl"
                >
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <span className="font-semibold text-foreground">
              Page {page} of {pageCount}
            </span>

            <div className="flex items-center gap-1">
              <button
                aria-label="First page"
                disabled={page === 1}
                onClick={() => setCurrentPage(1)}
                className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground disabled:opacity-40"
              >
                <IconChevronsLeft className="w-4 h-4" />
              </button>
              <button
                aria-label="Previous page"
                disabled={page === 1}
                onClick={() => setCurrentPage(page - 1)}
                className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground disabled:opacity-40"
              >
                <IconChevronLeft className="w-4 h-4" />
              </button>
              <button
                aria-label="Next page"
                disabled={page === pageCount}
                onClick={() => setCurrentPage(page + 1)}
                className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground disabled:opacity-40"
              >
                <IconChevronRight className="w-4 h-4" />
              </button>
              <button
                aria-label="Last page"
                disabled={page === pageCount}
                onClick={() => setCurrentPage(pageCount)}
                className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground disabled:opacity-40"
              >
                <IconChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!saving) setIsModalOpen(open);
        }}
      >
        <DialogContent className="bg-background border border-border text-foreground max-w-lg rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <IconSparkles className="w-4 h-4 text-[#22C55E]" />
              {editingWork ? "Edit Showcase Item" : "Add New Showcase Item"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveWork} className="space-y-4 text-xs pt-2">
            <div className="space-y-1">
              <label
                className="text-foreground font-semibold"
                htmlFor="works-title"
              >
                Project Title
              </label>
              <Input
                id="works-title"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g. Apex AI Workspace"
                className="bg-muted border-border text-foreground placeholder:text-zinc-600 focus-visible:ring-[#22C55E] h-10 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-foreground font-semibold">
                  Category
                </label>
                <Select
                  value={formData.category}
                  onValueChange={(val) =>
                    val && setFormData({ ...formData, category: val })
                  }
                >
                  <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-xl text-xs focus:ring-[#22C55E]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border text-foreground text-xs rounded-xl">
                    <SelectItem value="Web App Design">
                      Web App Design
                    </SelectItem>
                    <SelectItem value="SaaS Platform">SaaS Platform</SelectItem>
                    <SelectItem value="Branding & Mobile">
                      Branding & Mobile
                    </SelectItem>
                    <SelectItem value="3D & Motion">3D & Motion</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label
                  className="text-foreground font-semibold"
                  htmlFor="works-client_name"
                >
                  Client Name
                </label>
                <Input
                  id="works-client_name"
                  required
                  value={formData.client_name}
                  onChange={(e) =>
                    setFormData({ ...formData, client_name: e.target.value })
                  }
                  placeholder="e.g. Vanguard Global"
                  className="bg-muted border-border text-foreground focus-visible:ring-[#22C55E] h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label
                className="text-foreground font-semibold"
                htmlFor="works-image_url"
              >
                Image URL
              </label>
              <Input
                id="works-image_url"
                required
                value={formData.image_url}
                onChange={(e) =>
                  setFormData({ ...formData, image_url: e.target.value })
                }
                className="bg-muted border-border text-foreground focus-visible:ring-[#22C55E] h-10 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1">
              <label
                className="text-foreground font-semibold"
                htmlFor="works-description"
              >
                Description
              </label>
              <textarea
                id="works-description"
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Overview of project achievements..."
                className="w-full p-3 rounded-xl bg-muted border border-border text-foreground placeholder-zinc-600 focus:outline-none focus:border-[#22C55E] text-xs"
              />
            </div>

            <div className="space-y-1">
              <label
                className="text-foreground font-semibold"
                htmlFor="works-status"
              >
                Publication status
              </label>
              <Select
                value={formData.status}
                onValueChange={(val) =>
                  val &&
                  setFormData({
                    ...formData,
                    status: val as "published" | "draft" | "archived",
                  })
                }
              >
                <SelectTrigger
                  id="works-status"
                  className="bg-muted border-border text-foreground h-10 rounded-xl text-xs focus:ring-[#22C55E]"
                >
                  <SelectValue placeholder="Publication status" />
                </SelectTrigger>
                <SelectContent className="bg-muted border-border text-foreground text-xs rounded-xl">
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="featuredCheck"
                checked={formData.featured}
                onCheckedChange={(c) =>
                  setFormData({ ...formData, featured: !!c })
                }
                className="border-border data-[state=checked]:bg-[#22C55E] data-[state=checked]:text-background"
              />
              <label
                htmlFor="featuredCheck"
                className="text-foreground font-semibold cursor-pointer"
              >
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
                disabled={saving}
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
