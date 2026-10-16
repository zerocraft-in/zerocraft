"use client";

import React, { useState, useMemo, useEffect } from "react";
import { IconStar, IconCircleCheck, IconCircleX, IconPlus, IconSearch, IconX, IconSparkles, IconChevronDown, IconColumns, IconDotsVertical, IconChevronsLeft, IconChevronLeft, IconChevronRight, IconChevronsRight, IconLoader2 } from "@tabler/icons-react";
import { supabase, fetchReviewsFromSupabase } from "@/lib/supabase-client";
import { toast } from "sonner";

import {
  Badge, Button, Checkbox, Dialog, DialogContent, DialogHeader, DialogTitle,
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Input, InputGroup,
  InputGroupInput, InputGroupText, Select, SelectContent, SelectItem, SelectTrigger,
  SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs,
  TabsList, TabsTrigger,
} from "@/components/ui/studio-controls";

interface ReviewItem {
  id: string;
  client_name: string;
  client_role: string;
  company: string;
  rating: number;
  comment: string;
  status: "approved" | "pending" | "rejected" | string;
  created_at: string;
}

export default function StudioReviewsCRUD() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "approved" | "pending">("all");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState("10");

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try { const data = await fetchReviewsFromSupabase(true); setReviews(data as ReviewItem[]); }
      catch { toast.error("Reviews could not be loaded. Check your connection and reload."); }
      finally { setIsLoading(false); }
    }
    loadData();
  }, []);

  const [visibleColumns, setVisibleColumns] = useState({
    client: true,
    company: true,
    rating: true,
    comment: true,
    status: true,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    client_name: "",
    client_role: "VP of Engineering",
    company: "",
    rating: 5,
    comment: "",
    status: "approved",
  });

  const [busy, setBusy] = useState(false);
  const [editingReview, setEditingReview] = useState<string | null>(null);
  function openCreateReview() {
    setEditingReview(null);
    setFormData({ client_name: "", client_role: "", company: "", rating: 5, comment: "", status: "pending" });
    setIsModalOpen(true);
  }
  function openEditReview(review: ReviewItem) {
    setEditingReview(review.id);
    setFormData({ client_name: review.client_name, client_role: review.client_role, company: review.company, rating: review.rating, comment: review.comment, status: review.status });
    setIsModalOpen(true);
  }
  async function changeReviews(ids: string[], status?: string) {
    if (busy || !ids.length) return;
    if (!status && !confirm(`Delete ${ids.length} review(s) permanently?`)) return;
    setBusy(true);
    try {
      const query = status ? supabase.from("reviews").update({ status }) : supabase.from("reviews").delete();
      const { data, error } = await query.in("id", ids).select("id");
      if (error) throw error;
      const changed = new Set((data || []).map(item => item.id));
      setReviews(previous => status ? previous.map(item => changed.has(item.id) ? { ...item, status } : item) : previous.filter(item => !changed.has(item.id)));
      setSelectedRows(previous => previous.filter(id => !changed.has(id)));
      if (changed.size !== ids.length) toast.error("Some records could not be changed. Check access and refresh.");
      else toast.success(status ? "Review status updated" : "Reviews deleted");
    } catch { toast.error("The change could not be saved. Please try again."); }
    finally { setBusy(false); }
  }
  const handleStatusChange = (id: string, status: string) => changeReviews([id], status);
  const handleDelete = (id: string) => changeReviews([id]);
  const handleBulkStatusChange = (status: string) => changeReviews(selectedRows, status);
  const handleBulkDelete = () => changeReviews(selectedRows);
  const handleCreateReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const query = editingReview ? supabase.from("reviews").update(formData).eq("id", editingReview) : supabase.from("reviews").insert([formData]);
      const { data, error } = await query.select().single();
      if (error) throw error;
      setReviews(previous => editingReview ? previous.map(item => item.id === editingReview ? data : item) : [data, ...previous]);
      setIsModalOpen(false);
      toast.success("Review saved");
    } catch { toast.error("Could not save. Your review draft is still here."); }
    finally { setBusy(false); }
  };

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const matchesSearch =
        r.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.comment.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === "all" || r.status === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [reviews, searchQuery, activeTab]);

  const pageCount = Math.max(1, Math.ceil(filteredReviews.length / Number(rowsPerPage)));
  const page = Math.min(currentPage, pageCount);
  const pageRows = filteredReviews.slice((page - 1) * Number(rowsPerPage), page * Number(rowsPerPage));

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
    const app = reviews.filter((r) => r.status === "approved").length;
    const pnd = reviews.filter((r) => r.status === "pending").length;
    return { all: reviews.length, approved: app, pending: pnd };
  }, [reviews]);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pt-2 text-foreground font-sans antialiased">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground flex items-center gap-2.5">
            <IconStar className="w-6 h-6 text-[#22C55E] fill-[#22C55E]" /> Reviews
          </h1>
          <p className="text-xs text-muted-foreground font-normal mt-0.5">
            Review client testimonials and moderate public feedback from your workspace.
          </p>
        </div>

        <Button
          onClick={openCreateReview}
        >
          <IconPlus className="w-4 h-4" />
          <span>Add Testimonial</span>
        </Button>
      </div>

      {/* Reference-Styled Table Container */}
      <div className=" py-6 bg-background space-y-6">
        {/* Top Pill Tabs & Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full lg:w-auto">
            <TabsList className="flex items-center gap-1.5 h-auto">
              <TabsTrigger
                value="all"
                className="gap-1"
              >
                <span>All Testimonials</span>
                <Badge className="px-2 py-0.2 rounded-full bg-zinc-700 text-foreground text-[10px] font-bold">
                  {tabCounts.all}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="approved"
                className="gap-1"
              >
                <span>Approved</span>
                <Badge className="px-2 py-0.2 rounded-full bg-[#22C55E]/20 text-[#4ADE80] text-[10px] font-bold">
                  {tabCounts.approved}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="pending"
                className="gap-1"
              >
                <span>Pending</span>
                <Badge className="px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                  {tabCounts.pending}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2.5">
            <InputGroup className="w-48 h-10">
              <InputGroupText className="pl-3 bg-transparent border-0">
                <IconSearch className="h-3.5 w-3.5 text-muted-foreground" />
              </InputGroupText>

              <InputGroupInput
                value={searchQuery}
                onChange={(e) => (setSearchQuery(e.target.value), setCurrentPage(1))}
                placeholder="Filter reviews..."
                className="h-9 border-0 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </InputGroup>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <IconColumns className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Customize columns</span>
                  <IconChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-muted border-border text-foreground text-xs rounded-xl w-44">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-accent" />
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.client}
                  onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, client: !!v }))}
                >
                  Client & Role
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.company}
                  onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, company: !!v }))}
                >
                  Company
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.rating}
                  onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, rating: !!v }))}
                >
                  Rating
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.comment}
                  onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, comment: !!v }))}
                >
                  Feedback Comment
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.status}
                  onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, status: !!v }))}
                >
                  Status
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={openCreateReview}
            >
              <IconPlus className="w-3.5 h-3.5" />
              <span>Add Testimonial</span>
            </Button>
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
                  <TableHead className="text-foreground font-extrabold text-xs">Client & Role</TableHead>
                )}
                {visibleColumns.company && (
                  <TableHead className="text-foreground font-extrabold text-xs">Company</TableHead>
                )}
                {visibleColumns.rating && (
                  <TableHead className="text-foreground font-extrabold text-xs">Rating</TableHead>
                )}
                {visibleColumns.comment && (
                  <TableHead className="text-foreground font-extrabold text-xs">Feedback Comment</TableHead>
                )}
                {visibleColumns.status && (
                  <TableHead className="text-foreground font-extrabold text-xs">Status</TableHead>
                )}
                <TableHead className="w-12 text-right text-muted-foreground"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-zinc-800/50">
              {isLoading ? (
                <TableRow className="hover:bg-transparent border-none">
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    <IconLoader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-600" />
                    Loading reviews...
                  </TableCell>
                </TableRow>
              ) : filteredReviews.length === 0 ? (
                <TableRow className="hover:bg-transparent border-none">
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    No client testimonials matching search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((rev) => {
                  const isSelected = selectedRows.includes(rev.id);
                  return (
                    <TableRow
                      key={rev.id}
                      className={`border-border transition-colors hover:bg-muted/60 ${isSelected ? "bg-muted/70" : ""
                        }`}
                    >
                      <TableCell className="w-10 p-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(c) => handleSelectRow(rev.id, !!c)}
                          className="border-border data-[state=checked]:bg-white data-[state=checked]:text-background"
                        />
                      </TableCell>

                      {visibleColumns.client && (
                        <TableCell className="p-3">
                          <div className="font-bold text-foreground text-xs">{rev.client_name}</div>
                          <div className="text-[11px] text-muted-foreground">{rev.client_role}</div>
                        </TableCell>
                      )}

                      {visibleColumns.company && (
                        <TableCell className="p-3">
                          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold bg-muted border border-border text-foreground">
                            {rev.company}
                          </span>
                        </TableCell>
                      )}

                      {visibleColumns.rating && (
                        <TableCell className="p-3">
                          <div className="flex items-center gap-1 text-[#22C55E]">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <IconStar
                                key={i}
                                className={`w-3.5 h-3.5 ${i < rev.rating ? "fill-[#22C55E] text-[#22C55E]" : "text-zinc-700"
                                  }`}
                              />
                            ))}
                          </div>
                        </TableCell>
                      )}

                      {visibleColumns.comment && (
                        <TableCell className="p-3 text-xs text-foreground max-w-sm truncate italic">
                          &ldquo;{rev.comment}&rdquo;
                        </TableCell>
                      )}

                      {visibleColumns.status && (
                        <TableCell className="p-3">
                          {rev.status === "approved" ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-muted border border-border text-emerald-400">
                              <IconCircleCheck className="w-3.5 h-3.5 text-[#22C55E] fill-[#22C55E]/20" />
                              <span>Done (Approved)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-muted border border-border text-amber-400">
                              <IconLoader2 className="w-3 h-3 text-amber-400 animate-spin" />
                              <span>In Process (Pending)</span>
                            </span>
                          )}
                        </TableCell>
                      )}

                      <TableCell className="w-12 text-right p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size={"icon"} variant={"secondary"} className=" rounded-lg text-muted-foreground hover:text-accent-foreground hover:bg-accent transition-colors">
                              <IconDotsVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs w-44">
                            <DropdownMenuItem onClick={() => openEditReview(rev)}>Edit testimonial</DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(rev.id, "approved")}
                              className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                            >
                              Approve Testimonial
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(rev.id, "pending")}
                              className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                            >
                              Mark as Pending
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-accent" />
                            <DropdownMenuItem
                              onClick={() => handleDelete(rev.id)}
                              className="cursor-pointer text-rose-400 focus:bg-rose-500/10 focus:text-rose-400"
                            >
                              Delete Testimonial
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
            <span>{selectedRows.length} of {filteredReviews.length} row(s) selected.</span>
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

      {/* CREATE MODAL */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!busy) setIsModalOpen(open); }}>
        <DialogContent className="bg-background border border-border text-foreground max-w-lg rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <IconSparkles className="w-4 h-4 text-[#22C55E]" />
              {editingReview ? "Edit testimonial" : "Add testimonial"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateReview} className="space-y-4 text-xs pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-foreground font-semibold" htmlFor="reviews-client_name">Client Name</label>
                <Input id="reviews-client_name"
                  required
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="e.g. Sarah Jenkins"
                  className="bg-muted border-border text-foreground focus-visible:ring-[#22C55E] h-10 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-foreground font-semibold" htmlFor="reviews-client_role">Client Role</label>
                <Input id="reviews-client_role"
                  value={formData.client_role}
                  onChange={(e) => setFormData({ ...formData, client_role: e.target.value })}
                  className="bg-muted border-border text-foreground focus-visible:ring-[#22C55E] h-10 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-foreground font-semibold" htmlFor="reviews-company">Company Name</label>
                <Input id="reviews-company"
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="bg-muted border-border text-foreground focus-visible:ring-[#22C55E] h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-foreground font-semibold">Rating (1 to 5 Stars)</label>
              <Select
                value={String(formData.rating)}
                onValueChange={(val) => setFormData({ ...formData, rating: Number(val) })}
              >
                <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-xl text-xs focus:ring-[#22C55E]">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent className="bg-muted border-border text-foreground text-xs rounded-xl">
                  <SelectItem value="5">5 Stars (Excellent)</SelectItem>
                  <SelectItem value="4">4 Stars (Very Good)</SelectItem>
                  <SelectItem value="3">3 Stars (Average)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-foreground font-semibold" htmlFor="reviews-comment">Testimonial Comment</label>
              <textarea id="reviews-comment"
                rows={3}
                required
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Feedback comment..."
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
                type="submit" disabled={busy}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-extrabold text-xs rounded-xl"
              >
                Save Review
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Floating Action Bar */}
      {selectedRows.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-3 bg-background border border-border p-2 rounded-full shadow-2xl backdrop-blur-md">
            <div className="px-3 text-xs font-semibold text-foreground border-r border-border">
              {selectedRows.length} selected
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulkStatusChange("approved")}
                className="h-8 rounded-full text-xs font-semibold text-[#22C55E] hover:text-[#22C55E] hover:bg-[#22C55E]/10"
              >
                Approve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulkStatusChange("pending")}
                className="h-8 rounded-full text-xs font-semibold text-amber-400 hover:text-amber-400 hover:bg-amber-400/10"
              >
                Pending
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBulkDelete}
                className="h-8 rounded-full text-xs font-semibold text-rose-400 hover:text-rose-400 hover:bg-rose-500/10"
              >
                Delete
              </Button>
              <div className="w-px h-4 bg-accent mx-1" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedRows([])}
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-accent-foreground"
              >
                <IconX className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
