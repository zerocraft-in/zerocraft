"use client";

import React, { useState, useMemo, useEffect } from "react";
import { IconPlus, IconSearch, IconEdit, IconTrash, IconEye, IconFileText, IconCircleCheck, IconClock, IconX, IconSparkles, IconChevronDown, IconColumns, IconDotsVertical, IconChevronsLeft, IconChevronLeft, IconChevronRight, IconChevronsRight, IconLoader2 } from "@tabler/icons-react";
import {
  fetchBlogsFromSupabase,
  createBlogInSupabase,
  updateBlogInSupabase,
  deleteBlogInSupabase,
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

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: "published" | "draft" | string;
  author_name: string;
  category: string;
  views_count: number;
  created_at: string;
}

export default function StudioBlogsCRUD() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "published" | "draft">("all");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    title: true,
    category: true,
    status: true,
    views: true,
    author: true,
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);

  // Load blogs from Supabase
  useEffect(() => {
    fetchBlogsFromSupabase().then((data) => {
      if (data) setBlogs(data as any);
      setIsLoading(false);
    });
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: "UI/UX Design",
    status: "published",
    author_name: "Alex Morgan",
  });

  const openCreateModal = () => {
    setEditingBlog(null);
    setFormData({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      category: "UI/UX Design",
      status: "published",
      author_name: "Alex Morgan",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (blog: Blog) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt,
      content: blog.content,
      category: blog.category,
      status: blog.status,
      author_name: blog.author_name,
    });
    setIsModalOpen(true);
  };

  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const payload = { ...formData, slug };

    if (editingBlog) {
      try {
        const updated = await updateBlogInSupabase(editingBlog.id, payload);
        setBlogs((prev) =>
          prev.map((b) => (b.id === editingBlog.id ? { ...b, ...updated } : b))
        );
      } catch (err) {
        setBlogs((prev) =>
          prev.map((b) => (b.id === editingBlog.id ? { ...b, ...payload } : b))
        );
      }
    } else {
      try {
        const created = await createBlogInSupabase(payload);
        setBlogs((prev) => [created as any, ...prev]);
      } catch (err) {
        const newBlog: Blog = {
          id: `blog-${Date.now()}`,
          ...payload,
          views_count: 0,
          created_at: new Date().toISOString(),
        };
        setBlogs((prev) => [newBlog, ...prev]);
      }
    }
    setIsModalOpen(false);
  };

  const handleDeleteBlog = async (id: string) => {
    if (confirm("Are you sure you want to delete this blog post?")) {
      try {
        await deleteBlogInSupabase(id);
      } catch (e) {}
      setBlogs((prev) => prev.filter((b) => b.id !== id));
      setSelectedRows((prev) => prev.filter((rId) => rId !== id));
    }
  };

  const toggleStatus = async (id: string) => {
    const target = blogs.find((b) => b.id === id);
    if (!target) return;
    const newStatus = target.status === "published" ? "draft" : "published";
    try {
      await updateBlogInSupabase(id, { status: newStatus });
    } catch (e) {}
    setBlogs((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              status: newStatus,
            }
          : b
      )
    );
  };

  // Filtered blogs
  const filteredBlogs = useMemo(() => {
    return blogs.filter((b) => {
      const matchesSearch =
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.author_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === "all" || b.status === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [blogs, searchQuery, activeTab]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(filteredBlogs.map((b) => b.id));
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
    filteredBlogs.length > 0 && selectedRows.length === filteredBlogs.length;

  const tabCounts = useMemo(() => {
    const pub = blogs.filter((b) => b.status === "published").length;
    const drf = blogs.filter((b) => b.status === "draft").length;
    return { all: blogs.length, published: pub, draft: drf };
  }, [blogs]);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pt-2 text-foreground font-sans antialiased">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground flex items-center gap-2.5">
            <IconFileText className="w-6 h-6 text-[#22C55E]" /> Blogs
          </h1>
          <p className="text-xs text-muted-foreground font-normal mt-0.5">
            Publish, edit, and curate studio articles and insights.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="h-11 px-5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-extrabold flex items-center gap-2 shadow-lg transition-all self-start sm:self-auto"
        >
          <IconPlus className="w-4 h-4" />
          <span>New Article</span>
        </button>
      </div>

      {/* Reference-Styled Ultra-Sleek Table Container */}
      <div className=" py-6 bg-background space-y-6">
        {/* Top Header Pill Tabs & Actions Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left Pill Tab Switcher */}
          <div className="flex items-center gap-1.5 bg-card p-1.5 rounded-full border border-border max-w-max">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "all"
                  ? "bg-accent text-foreground border border-border shadow-md"
                  : "text-muted-foreground hover:text-accent-foreground"
                }`}
            >
              <span>All Articles</span>
              <span className="px-1.5 py-0.2 rounded-full bg-zinc-700 text-foreground text-[10px] font-bold">
                {tabCounts.all}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("published")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === "published"
                  ? "bg-accent text-foreground border border-border shadow-md"
                  : "text-muted-foreground hover:text-accent-foreground"
                }`}
            >
              <span>Published</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#22C55E]/20 text-[#4ADE80] text-[10px] font-bold">
                {tabCounts.published}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("draft")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === "draft"
                  ? "bg-accent text-foreground border border-border shadow-md"
                  : "text-muted-foreground hover:text-accent-foreground"
                }`}
            >
              <span>Drafts</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                {tabCounts.draft}
              </span>
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* IconSearch Input Filter */}
            <div className="relative w-48">
              <IconSearch className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter articles..."
                className="h-9 pl-9 pr-3 rounded-full bg-card border-border text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-[#22C55E]"
              />
            </div>

            {/* Customize IconColumns Dropdown */}
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
                  Article Title
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.category}
                  onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, category: !!v }))}
                >
                  Category
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.status}
                  onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, status: !!v }))}
                >
                  Status
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.views}
                  onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, views: !!v }))}
                >
                  Views
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.author}
                  onCheckedChange={(v) => setVisibleColumns((p) => ({ ...p, author: !!v }))}
                >
                  Author
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Add Entry Button */}
            <button
              onClick={openCreateModal}
              className="h-9 px-4 rounded-full bg-muted hover:bg-accent border border-border text-xs font-bold text-foreground flex items-center gap-1.5 transition-all shadow-md"
            >
              <IconPlus className="w-3.5 h-3.5" />
              <span>Add Article</span>
            </button>
          </div>
        </div>

        {/* Reference Image Styled shadcn UI Table */}
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
                  <TableHead className="text-foreground font-extrabold text-xs">Article Title & Slug</TableHead>
                )}
                {visibleColumns.category && (
                  <TableHead className="text-foreground font-extrabold text-xs">Category</TableHead>
                )}
                {visibleColumns.status && (
                  <TableHead className="text-foreground font-extrabold text-xs">Status</TableHead>
                )}
                {visibleColumns.views && (
                  <TableHead className="text-foreground font-extrabold text-xs">Views</TableHead>
                )}
                {visibleColumns.author && (
                  <TableHead className="text-foreground font-extrabold text-xs">Author</TableHead>
                )}
                <TableHead className="w-12 text-right text-muted-foreground"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-zinc-800/50">
              {filteredBlogs.length === 0 ? (
                <TableRow className="hover:bg-transparent border-none">
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    No articles matching search or filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBlogs.map((blog) => {
                  const isSelected = selectedRows.includes(blog.id);
                  return (
                    <TableRow
                      key={blog.id}
                      className={`border-border transition-colors hover:bg-muted/60 ${isSelected ? "bg-muted/70" : ""
                        }`}
                    >
                      {/* Checkbox */}
                      <TableCell className="w-10 p-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(c) => handleSelectRow(blog.id, !!c)}
                          className="border-border data-[state=checked]:bg-white data-[state=checked]:text-background"
                        />
                      </TableCell>

                      {/* Title & Slug */}
                      {visibleColumns.title && (
                        <TableCell className="p-3">
                          <div className="font-bold text-foreground max-w-xs sm:max-w-sm truncate text-xs">
                            {blog.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-xs font-mono">
                            /{blog.slug}
                          </div>
                        </TableCell>
                      )}

                      {/* Category Badge matching outline pill */}
                      {visibleColumns.category && (
                        <TableCell className="p-3">
                          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold bg-muted border border-border text-foreground">
                            {blog.category}
                          </span>
                        </TableCell>
                      )}

                      {/* Status Pill */}
                      {visibleColumns.status && (
                        <TableCell className="p-3">
                          {blog.status === "published" ? (
                            <button
                              onClick={() => toggleStatus(blog.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-muted border border-border text-emerald-400 hover:bg-accent transition-colors"
                            >
                              <IconCircleCheck className="w-3.5 h-3.5 text-[#22C55E] fill-[#22C55E]/20" />
                              <span>Done</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleStatus(blog.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-muted border border-border text-amber-400 hover:bg-accent transition-colors"
                            >
                              <IconLoader2 className="w-3 h-3 text-amber-400 animate-spin" />
                              <span>In Process</span>
                            </button>
                          )}
                        </TableCell>
                      )}

                      {/* Views Count */}
                      {visibleColumns.views && (
                        <TableCell className="p-3 text-xs font-bold text-foreground">
                          <div className="flex items-center gap-1.5">
                            <IconEye className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{blog.views_count}</span>
                          </div>
                        </TableCell>
                      )}

                      {/* Author */}
                      {visibleColumns.author && (
                        <TableCell className="p-3 text-xs font-semibold text-foreground">
                          {blog.author_name}
                        </TableCell>
                      )}

                      {/* Actions Menu */}
                      <TableCell className="w-12 text-right p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded-lg text-muted-foreground hover:text-accent-foreground hover:bg-accent transition-colors">
                              <IconDotsVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-muted border-border text-foreground text-xs rounded-xl w-44">
                            <DropdownMenuItem
                              onClick={() => openEditModal(blog)}
                              className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                            >
                              Edit Article
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toggleStatus(blog.id)}
                              className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                            >
                              Toggle Status ({blog.status === "published" ? "Draft" : "Publish"})
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-accent" />
                            <DropdownMenuItem
                              onClick={() => handleDeleteBlog(blog.id)}
                              className="cursor-pointer text-rose-400 focus:bg-rose-500/10 focus:text-rose-400"
                            >
                              Delete Article
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

        {/* Footer Pagination Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-muted-foreground pt-2">
          <div>
            <span>{selectedRows.length} of {filteredBlogs.length} row(s) selected.</span>
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

      {/* CREATE / EDIT ARTICLE MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-background border border-border text-foreground max-w-xl rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <IconSparkles className="w-4 h-4 text-[#22C55E]" />
              {editingBlog ? "Edit Blog Article" : "Create New Blog Article"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveBlog} className="space-y-4 text-xs pt-2">
            <div className="space-y-1">
              <label className="text-foreground font-semibold">Article Title</label>
              <Input
                required
                value={formData.title}
                onChange={(e) => {
                  const title = e.target.value;
                  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                  setFormData({ ...formData, title, slug });
                }}
                placeholder="e.g. Designing Next-Gen AI Dashboards"
                className="bg-muted border-border text-foreground placeholder:text-zinc-600 focus-visible:ring-[#22C55E] h-10 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-foreground font-semibold">URL Slug</label>
                <Input
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="bg-muted border-border text-foreground focus-visible:ring-[#22C55E] h-10 rounded-xl text-xs"
                />
              </div>

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
                    <SelectItem value="UI/UX Design">UI/UX Design</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="AI & Research">AI & Research</SelectItem>
                    <SelectItem value="Branding">Branding</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-foreground font-semibold">Excerpt Summary</label>
              <Input
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="Brief 1-2 sentence description"
                className="bg-muted border-border text-foreground placeholder:text-zinc-600 focus-visible:ring-[#22C55E] h-10 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-foreground font-semibold">Content Body</label>
              <textarea
                rows={4}
                required
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write complete markdown/text content..."
                className="w-full p-3 rounded-xl bg-muted border border-border text-foreground placeholder-zinc-600 focus:outline-none focus:border-[#22C55E] text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-foreground font-semibold">Publish Status</label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => val && setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-xl text-xs focus:ring-[#22C55E]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border text-foreground text-xs rounded-xl">
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-foreground font-semibold">Author Name</label>
                <Input
                  value={formData.author_name}
                  onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
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
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-extrabold text-xs rounded-xl"
              >
                {editingBlog ? "Update Article" : "Publish Article"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
