"use client";

import { toast } from "@/lib/toast";
import React, { useState, useMemo, useEffect } from "react";
import {
  IconPlus,
  IconSearch,
  IconEye,
  IconFileText,
  IconCircleCheck,
  IconSparkles,
  IconChevronDown,
  IconColumns,
  IconDotsVertical,
  IconChevronsLeft,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsRight,
  IconLoader2,
} from "@tabler/icons-react";
import {
  fetchBlogsFromSupabase,
  createBlogInSupabase,
  updateBlogInSupabase,
  deleteBlogInSupabase,
} from "@/lib/supabase-client";

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
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
import { Field } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: "draft" | "draft" | string;
  author_name: string;
  category: string;
  views_count: number;
  created_at: string;
}

export default function StudioBlogsCRUD() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "published" | "draft">(
    "all",
  );
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
    fetchBlogsFromSupabase(true)
      .then((data) => {
        if (data) setBlogs(data as any);
        setIsLoading(false);
      })
      .catch(() => {
        toast.error(
          "Records could not be loaded. Check your connection and reload.",
        );
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
    status: "draft",
    author_name: "",
  });

  const openCreateModal = () => {
    setEditingBlog(null);
    setFormData({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      category: "UI/UX Design",
      status: "draft",
      author_name: "",
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

  const [saving, setSaving] = useState(false);
  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const payload = {
      ...formData,
      slug: (formData.slug || formData.title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    };
    try {
      if (editingBlog) {
        const updated = await updateBlogInSupabase(editingBlog.id, payload);
        setBlogs((previous) =>
          previous.map((item) =>
            item.id === editingBlog.id ? { ...item, ...updated } : item,
          ),
        );
      } else {
        const created = await createBlogInSupabase(payload);
        setBlogs((previous) => [created as Blog, ...previous]);
      }
      toast.success("Blog saved");
      setIsModalOpen(false);
    } catch {
      toast.error(
        "Could not save. Your changes are still here. Check your connection and permissions, then try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlog = async (id: string) => {
    if (confirm("Are you sure you want to delete this blog post?")) {
      try {
        await deleteBlogInSupabase(id);
      } catch {
        toast.error(
          "Could not save this change. Check your connection and permissions.",
        );
        return;
      }
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
    } catch {
      toast.error(
        "Could not save this change. Check your connection and permissions.",
      );
      return;
    }
    setBlogs((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              status: newStatus,
            }
          : b,
      ),
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

  const pageCount = Math.max(
    1,
    Math.ceil(filteredBlogs.length / Number(rowsPerPage)),
  );
  const page = Math.min(currentPage, pageCount);
  const pageRows = filteredBlogs.slice(
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
      setSelectedRows((prev) => [...prev, id]);
    } else {
      setSelectedRows((prev) => prev.filter((item) => item !== id));
    }
  };

  const isAllSelected =
    pageRows.length > 0 &&
    pageRows.every((item) => selectedRows.includes(item.id));

  const tabCounts = useMemo(() => {
    const pub = blogs.filter((b) => b.status === "published").length;
    const drf = blogs.filter((b) => b.status === "draft").length;
    return { all: blogs.length, published: pub, draft: drf };
  }, [blogs]);

  return (
    <div className="space-y-6 pt-2 font-sans text-foreground antialiased">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <IconFileText className="size-5 text-muted-foreground" /> Blogs
          </h1>
          <p className="text-xs text-muted-foreground font-normal mt-0.5">
            Publish, edit, and curate studio articles and insights.
          </p>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={openCreateModal}
          className="self-start rounded-xl sm:self-auto"
        >
          <IconPlus className="w-4 h-4" />
          <span>New Article</span>
        </Button>
      </div>

      {/* Reference-Styled Ultra-Sleek Table Container */}
      <div className="space-y-4">
        {/* Top Tabs & Actions */}
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
                All articles{" "}
                <span className="ml-1 text-xs text-muted-foreground">
                  {tabCounts.all}
                </span>
              </TabsTrigger>
              <TabsTrigger value="published">
                Published{" "}
                <span className="ml-1 text-xs text-muted-foreground">
                  {tabCounts.published}
                </span>
              </TabsTrigger>
              <TabsTrigger value="draft">
                Drafts{" "}
                <span className="ml-1 text-xs text-muted-foreground">
                  {tabCounts.draft}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2.5">
            <Field className="max-w-sm">
              <InputGroup className="h-9 rounded-xl">
                <InputGroupInput
                  id="blogs-search"
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
                  Article Title
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
                  checked={visibleColumns.status}
                  onCheckedChange={(v) =>
                    setVisibleColumns((p) => ({ ...p, status: !!v }))
                  }
                >
                  Status
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.views}
                  onCheckedChange={(v) =>
                    setVisibleColumns((p) => ({ ...p, views: !!v }))
                  }
                >
                  Views
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.author}
                  onCheckedChange={(v) =>
                    setVisibleColumns((p) => ({ ...p, author: !!v }))
                  }
                >
                  Author
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </div>

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
                    Article Title & Slug
                  </TableHead>
                )}
                {visibleColumns.category && (
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Category
                  </TableHead>
                )}
                {visibleColumns.status && (
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Status
                  </TableHead>
                )}
                {visibleColumns.views && (
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Views
                  </TableHead>
                )}
                {visibleColumns.author && (
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Author
                  </TableHead>
                )}
                <TableHead className="w-12 text-right text-muted-foreground"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {filteredBlogs.length === 0 ? (
                <TableRow className="hover:bg-transparent border-none">
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-xs text-muted-foreground"
                  >
                    No articles matching search or filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((blog) => {
                  const isSelected = selectedRows.includes(blog.id);
                  return (
                    <TableRow
                      key={blog.id}
                      className={`border-border transition-colors hover:bg-muted/60 ${
                        isSelected ? "bg-muted/70" : ""
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
                          <div className="max-w-xs truncate text-sm font-medium text-foreground sm:max-w-sm">
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
                          <span className="inline-flex rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-foreground">
                            {blog.category}
                          </span>
                        </TableCell>
                      )}

                      {/* Status Pill */}
                      {visibleColumns.status && (
                        <TableCell className="p-3">
                          {blog.status === "published" ? (
                            <Button
                              type="button"
                              onClick={() => toggleStatus(blog.id)}
                              variant="outline"
                              size="sm"
                              className="h-auto gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
                            >
                              <IconCircleCheck className="size-3.5 text-emerald-600" />
                              <span>Published</span>
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              onClick={() => toggleStatus(blog.id)}
                              variant="outline"
                              size="sm"
                              className="h-auto gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
                            >
                              <IconLoader2 className="size-3 text-muted-foreground" />
                              <span>Draft</span>
                            </Button>
                          )}
                        </TableCell>
                      )}

                      {/* Views Count */}
                      {visibleColumns.views && (
                        <TableCell className="p-3 text-xs font-medium text-foreground">
                          <div className="flex items-center gap-1.5">
                            <IconEye className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{blog.views_count}</span>
                          </div>
                        </TableCell>
                      )}

                      {/* Author */}
                      {visibleColumns.author && (
                        <TableCell className="p-3 text-xs font-medium text-foreground">
                          {blog.author_name}
                        </TableCell>
                      )}

                      {/* Actions Menu */}
                      <TableCell className="w-12 text-right p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg text-muted-foreground transition-colors hover:text-accent-foreground"
                            >
                              <IconDotsVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-44"
                          >
                            <DropdownMenuItem
                              onClick={() => openEditModal(blog)}
                              className="cursor-pointer"
                            >
                              Edit Article
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toggleStatus(blog.id)}
                              className="cursor-pointer"
                            >
                              Toggle Status (
                              {blog.status === "published"
                                ? "Draft"
                                : "Publish"}
                              )
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-accent" />
                            <DropdownMenuItem
                              onClick={() => handleDeleteBlog(blog.id)}
                              className="cursor-pointer text-destructive focus:text-destructive"
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
            <span>
              {selectedRows.length} of {filteredBlogs.length} row(s) selected.
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
              <Button
                aria-label="First page"
                disabled={page === 1}
                onClick={() => setCurrentPage(1)}
                variant="outline"
                size="icon"
                className="size-8 rounded-lg text-muted-foreground"
              >
                <IconChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                aria-label="Previous page"
                disabled={page === 1}
                onClick={() => setCurrentPage(page - 1)}
                variant="outline"
                size="icon"
                className="size-8 rounded-lg text-muted-foreground"
              >
                <IconChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                aria-label="Next page"
                disabled={page === pageCount}
                onClick={() => setCurrentPage(page + 1)}
                variant="outline"
                size="icon"
                className="size-8 rounded-lg text-muted-foreground"
              >
                <IconChevronRight className="w-4 h-4" />
              </Button>
              <Button
                aria-label="Last page"
                disabled={page === pageCount}
                onClick={() => setCurrentPage(pageCount)}
                variant="outline"
                size="icon"
                className="size-8 rounded-lg text-muted-foreground"
              >
                <IconChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT ARTICLE MODAL */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!saving) setIsModalOpen(open);
        }}
      >
        <DialogContent className="bg-background border border-border text-foreground max-w-xl rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <IconSparkles className="w-4 h-4 text-[#22C55E]" />
              {editingBlog ? "Edit Blog Article" : "Create New Blog Article"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveBlog} className="space-y-4 text-xs pt-2">
            <div className="space-y-1">
              <label
                className="text-foreground font-semibold"
                htmlFor="blogs-title"
              >
                Article Title
              </label>
              <Input
                id="blogs-title"
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
                <label
                  className="text-foreground font-semibold"
                  htmlFor="blogs-slug"
                >
                  URL Slug
                </label>
                <Input
                  id="blogs-slug"
                  required
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  className="bg-muted border-border text-foreground focus-visible:ring-[#22C55E] h-10 rounded-xl text-xs"
                />
              </div>

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
                    <SelectItem value="UI/UX Design">UI/UX Design</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="AI & Research">AI & Research</SelectItem>
                    <SelectItem value="Branding">Branding</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label
                className="text-foreground font-semibold"
                htmlFor="blogs-excerpt"
              >
                Excerpt Summary
              </label>
              <Input
                id="blogs-excerpt"
                value={formData.excerpt}
                onChange={(e) =>
                  setFormData({ ...formData, excerpt: e.target.value })
                }
                placeholder="Brief 1-2 sentence description"
                className="bg-muted border-border text-foreground placeholder:text-zinc-600 focus-visible:ring-[#22C55E] h-10 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1">
              <label
                className="text-foreground font-semibold"
                htmlFor="blogs-content"
              >
                Content Body
              </label>
              <textarea
                id="blogs-content"
                rows={4}
                required
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="Write complete markdown/text content..."
                className="w-full p-3 rounded-xl bg-muted border border-border text-foreground placeholder-zinc-600 focus:outline-none focus:border-[#22C55E] text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-foreground font-semibold">
                  Publish Status
                </label>
                <Select
                  value={formData.status}
                  onValueChange={(val) =>
                    val && setFormData({ ...formData, status: val })
                  }
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
                <label
                  className="text-foreground font-semibold"
                  htmlFor="blogs-author_name"
                >
                  Author Name
                </label>
                <Input
                  id="blogs-author_name"
                  value={formData.author_name}
                  onChange={(e) =>
                    setFormData({ ...formData, author_name: e.target.value })
                  }
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
                disabled={saving}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-extrabold text-xs rounded-xl"
              >
                {editingBlog ? "Update Article" : "Save article"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
