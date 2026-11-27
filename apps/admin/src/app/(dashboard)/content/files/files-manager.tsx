"use client";

import * as React from "react";
import Image from "next/image";
import { toast } from "@zerocraft/ui/toast";

import { Button } from "@zerocraft/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@zerocraft/ui/card";
import { Input } from "@zerocraft/ui/input";
import { Label } from "@zerocraft/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@zerocraft/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@zerocraft/ui/dropdown-menu";
import { Separator } from "@zerocraft/ui/separator";
import { Badge } from "@zerocraft/ui/badge";
import { Progress } from "@zerocraft/ui/progress";
import { Checkbox } from "@zerocraft/ui/checkbox";
import { Skeleton } from "@zerocraft/ui/skeleton";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@zerocraft/ui/empty";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zerocraft/ui/select";
import {
  deleteMediaFile,
  registerMediaFile,
  renameMediaFile,
} from "./actions";
import {
  Folder,
  Upload,
  Image as ImageIcon,
  Trash2,
  Edit,
  Copy,
  Search,
  Download,
  ExternalLink,
  Plus,
  FileText,
  Video,
  Music,
  MoreHorizontal,
  AlertCircle,
  Clock,
  RefreshCw,
  X,
  Check,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type MediaFile = {
  id: string;
  key: string;
  name: string;
  size: number;
  contentType: string | null;
  visibility: "public" | "private";
  deliveryUrl: string;
  downloadUrl?: string;
  uploadedBy: string | null;
  lastModified: string | null;
  organizationId: string;
};

type UploadItem = {
  id: string;
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error: string | null;
};

interface FilesManagerProps {
  organizationId: string;
  permissions: Set<string>;
}

const API_BASE = "/api/content/files";
const PAGE_SIZE = 50;

const TYPE_LABELS: Record<string, string> = {
  all: "All files",
  image: "Images",
  video: "Videos",
  document: "Documents",
  other: "Other",
};

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "size-asc", label: "Smallest first" },
  { value: "size-desc", label: "Largest first" },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fileIcon(contentType: string | null, name: string) {
  const type = (contentType ?? "").toLowerCase();
  if (type.startsWith("image/")) return <ImageIcon className="size-5" />;
  if (type.startsWith("video/")) return <Video className="size-5" />;
  if (type.startsWith("audio/")) return <Music className="size-5" />;
  if (type.includes("pdf")) return <FileText className="size-5" />;
  if (/\.(zip|rar|7z|tar|gz)$/i.test(name)) return (
    <FileText className="size-5" />
  );
  if (/\.(txt|csv|json|md)$/i.test(name)) return (
    <FileText className="size-5" />
  );
  return <FileText className="size-5 text-muted-foreground" />;
}

export default function FilesManager({
  organizationId,
  permissions,
}: FilesManagerProps) {
  const canCreate = permissions.has("media.create");
  const canUpdate = permissions.has("media.update");
  const canDelete = permissions.has("media.delete");

  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [files, setFiles] = React.useState<MediaFile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [sort, setSort] = React.useState("newest");
  const [uploads, setUploads] = React.useState<UploadItem[]>([]);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [renameMediaId, setRenameMediaId] = React.useState("");
  const [renameName, setRenameName] = React.useState("");
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteMediaId, setDeleteMediaId] = React.useState("");
  const [deleteName, setDeleteName] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isNextLoading, setIsNextLoading] = React.useState(false);

  const buildParams = () => {
    const params = new URLSearchParams();
    if (nextCursor) params.set("cursor", nextCursor);
    params.set("limit", String(PAGE_SIZE));
    if (search) params.set("search", search);
    if (typeFilter !== "all") params.set("type", typeFilter);
    params.set("sort", sort);
    return params;
  };

  const loadFiles = React.useCallback(async (resetCursor = true) => {
    if (resetCursor) {
      setNextCursor(null);
      setHasMore(false);
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      if (search) params.set("search", search);
      if (typeFilter !== "all") params.set("type", typeFilter);
      params.set("sort", sort);
      const res = await fetch(`${API_BASE}?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load files");
      const data = await res.json();
      if (resetCursor) {
        setFiles(data.files ?? []);
      } else {
        setFiles((prev) => [...prev, ...(data.files ?? [])]);
      }
      setNextCursor(data.nextCursor ?? null);
      setHasMore(Boolean(data.hasMore));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      setIsNextLoading(false);
    }
  }, [search, typeFilter, sort]);

  const loadMore = async () => {
    if (!nextCursor || isNextLoading || !hasMore) return;
    setIsNextLoading(true);
    try {
      const params = buildParams();
      const res = await fetch(`${API_BASE}?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load more files");
      const data = await res.json();
      setFiles((prev) => [...prev, ...(data.files ?? [])]);
      setNextCursor(data.nextCursor ?? null);
      setHasMore(Boolean(data.hasMore));
    } catch {
      toast.add({ title: "Failed to load more files.", type: "error" });
    } finally {
      setIsNextLoading(false);
    }
  };

  React.useEffect(() => {
    loadFiles(true);
  }, [organizationId, search, typeFilter, sort, loadFiles]);

  const allVisibleSelected =
    files.length > 0 && files.every((f) => selectedIds.has(f.id));
  const someVisibleSelected =
    selectedIds.size > 0 && !allVisibleSelected;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(files.map((f) => f.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedFiles = files.filter((f) => selectedIds.has(f.id));

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.length === 0) return;
    await startUploads(selected);
  };

  const startUploads = async (fileList: File[]) => {
    const items: UploadItem[] = fileList.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      status: "pending",
      progress: 0,
      error: null,
    }));
    setUploads((prev) => [...prev, ...items]);
    for (const item of items) {
      await uploadFile(item);
    }
  };

  const uploadFile = async (item: UploadItem): Promise<void> => {
    const { file } = item;
    setUploads((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: "uploading" } : i)),
    );

    try {
      const initRes = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          folder: "uploads",
        }),
      });
      if (!initRes.ok) {
        const err = await initRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to initiate upload");
      }
      const { uploadUrl, key, contentType: signedContentType } =
        (await initRes.json()) as {
          uploadUrl: string;
          key: string;
          contentType: string;
          downloadUrl: string;
        };

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", signedContentType);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploads((prev) =>
              prev.map((i) =>
                i.id === item.id
                  ? { ...i, progress: Math.round((e.loaded / e.total) * 100) }
                  : i,
              ),
            );
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else if (xhr.status === 403) {
            reject(
              new Error(
                "Upload forbidden (403): the R2 CORS policy may not allow this origin, or the signed content type does not match.",
              ),
            );
          } else if (xhr.status === 400) {
            reject(new Error("Upload rejected (400): invalid request to storage."));
          } else if (xhr.status === 404) {
            reject(
              new Error(
                "Upload failed (404): presigned URL expired or object not found.",
              ),
            );
          } else {
            reject(new Error(`Upload failed (${xhr.status})`));
          }
        };
        xhr.onerror = () => {
          // When CORS preflight fails, the browser blocks the request and
          // xhr.status is 0 with no response body. We cannot distinguish a
          // CORS rejection from a general network failure at this point, but
          // we can give a more actionable message than "Network error".
          reject(
            new Error(
              "Upload request failed: the browser could not complete the request to R2. This is usually caused by the R2 bucket CORS policy not allowing your origin (http://localhost:3000) or the PUT method, or by being offline. Check the browser Console for CORS errors.",
            ),
          );
        };
        xhr.ontimeout = () => reject(new Error("Upload timed out."));
        xhr.send(file);
      });

      const registerResult = await registerMediaFile({
        key,
        name: file.name,
        contentType: signedContentType,
        sizeBytes: file.size,
        url: `r2://${key}`,
      });

      if (!registerResult.ok) {
        throw new Error(registerResult.error);
      }

      setUploads((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: "done", progress: 100 } : i,
        ),
      );
      await loadFiles(true);
      toast.add({ title: `“${file.name}” uploaded.`, type: "success" });
    } catch (err) {
      setUploads((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: "error",
                error: err instanceof Error ? err.message : "Upload failed",
              }
            : i,
        ),
      );
      toast.add({ title: `Failed to upload “${file.name}”.`, type: "error" });
    }
  };

  const cancelUpload = (id: string) => {
    setUploads((prev) => prev.filter((i) => i.id !== id));
  };

  const handleDrop = (accepted: File[]) => {
    if (!canCreate) {
      toast.add({ title: "You do not have permission to upload files.", type: "error" });
      return;
    }
    startUploads(accepted);
  };

  const handleDelete = async () => {
    if (!deleteMediaId) return;
    try {
      const result = await deleteMediaFile({ mediaId: deleteMediaId });
      if (result.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== deleteMediaId));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(deleteMediaId);
          return next;
        });
        setDeleteOpen(false);
        setDeleteMediaId("");
        setDeleteName("");
        toast.add({ title: "File deleted.", type: "success" });
      } else {
        toast.add({ title: result.error, type: "error" });
      }
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Failed to delete file.", type: "error" });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) return;
    let succeeded = 0;
    let failed = 0;
    for (const file of selectedFiles) {
      try {
        const result = await deleteMediaFile({ mediaId: file.id });
        if (result.ok) {
          succeeded++;
          setFiles((prev) => prev.filter((f) => f.id !== file.id));
        } else {
          failed++;
          toast.add({ title: `Failed to delete “${file.name}”: ${result.error}`, type: "error" });
        }
      } catch {
        failed++;
        toast.add({ title: `Failed to delete “${file.name}”.`, type: "error" });
      }
    }
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
    if (succeeded)     toast.add({ title: `${succeeded} file(s) deleted.`, type: "success" });
    if (failed)     toast.add({ title: `${failed} file(s) failed to delete.`, type: "error" });
    await loadFiles(true);
  };

  const handleRename = async () => {
    if (!renameMediaId || !renameName.trim()) return;
    try {
      const result = await renameMediaFile({
        mediaId: renameMediaId,
        name: renameName.trim(),
      });
      if (result.ok) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === renameMediaId ? { ...f, name: renameName.trim() } : f,
          ),
        );
        setRenameOpen(false);
        setRenameMediaId("");
        setRenameName("");
        toast.add({ title: "File renamed.", type: "success" });
      } else {
        toast.add({ title: result.error, type: "error" });
      }
    } catch (err) {
      toast.add({ title: err instanceof Error ? err.message : "Failed to rename file.", type: "error" });
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast.add({ title: "URL copied to clipboard.", type: "success" });
    });
  };

  const openFile = (url: string) => {
    window.open(url, "_blank");
  };

  const downloadFile = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isImage = (f: MediaFile) => Boolean(f.contentType?.startsWith("image/"));

  const handleUploadClick = () => {
    if (!canCreate) {
      toast.add({ title: "You do not have permission to upload files.", type: "error" });
      return;
    }
    const input = document.getElementById("file-upload-input") as
      | HTMLInputElement
      | undefined;
    input?.click();
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col px-4 py-6 gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <CardTitle className="text-xl">Media Manager</CardTitle>
          <CardDescription>
            Files stored privately in Cloudflare R2 and served via short-lived signed URLs
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsRefreshing(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing" : "Refresh"}
          </Button>
          <Button onClick={handleUploadClick} disabled={!canCreate}>
            <Plus className="size-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      <UploadZone
        canCreate={canCreate}
        onDrop={handleDrop}
        onClick={handleUploadClick}
        activeUploads={uploads.filter((u) => u.status === "uploading").length}
      />

      {uploads.some((u) => u.status === "uploading") && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-4" />
              Uploading
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {uploads
              .filter((u) => u.status === "uploading")
              .map((u) => (
                <div key={u.id} className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate" title={u.file.name}>
                      {u.file.name}
                    </span>
                    <span className="text-muted-foreground">{u.progress}%</span>
                  </div>
                  <Progress value={u.progress} />
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {uploads.some((u) => u.status === "done" || u.status === "error") && (
        <div className="mt-2 flex flex-wrap gap-2">
          {uploads
            .filter((u) => u.status === "done" || u.status === "error")
            .map((u) => (
              <span
                key={u.id}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border",
                  u.status === "done"
                    ? "bg-green/10 text-green-700 border-green/20"
                    : "bg-red/10 text-red-700 border-red/20",
                )}
              >
                {u.status === "done" ? (
                  <Check className="size-3.5" />
                ) : (
                  <AlertCircle className="size-3.5" />
                )}
                {u.file.name}
                {u.status === "error" && ` — ${u.error}`}
                <button
                  type="button"
                  onClick={() => cancelUpload(u.id)}
                  className="ml-1 p-1 text-muted-foreground hover:text-red-600"
                  aria-label={`Remove ${u.file.name} from upload list`}
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">View</Label>
          <SegmentedControl
            value={view}
            options={[
              { value: "grid", label: "Grid" },
              { value: "list", label: "List" },
            ]}
            onChange={(v) => setView(v as "grid" | "list")}
          />
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Type</Label>
          <div className="w-full">
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v ?? "all")}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="All files" />
              </SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Sort</Label>
          <div className="w-full">
            <Select value={sort} onValueChange={(v) => setSort(v ?? "newest")}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder={SORT_OPTIONS.find((o) => o.value === sort)?.label} />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search files…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={allVisibleSelected}
              indeterminate={someVisibleSelected}
              onCheckedChange={toggleSelectAll}
              aria-label="Select all visible files"
            />
            <span className="text-sm font-medium">
              {selectedIds.size} file{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear selection
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={selectedFiles.length === 0}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4 mr-2" />
              Delete selected
            </Button>
          </div>
        </div>
      )}

      {files.length === 0 && !loading ? (
        <Empty className="border-0 p-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Folder className="size-16 mb-4 opacity-50" />
            </EmptyMedia>
            <EmptyTitle>
              {search || typeFilter !== "all" ? "No matching files" : "No files yet"}
            </EmptyTitle>
            <EmptyDescription>
              {canCreate ? (
                <>
                  Upload your first file to get started.{" "}
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    className="underline underline-offset-4 hover:text-primary"
                  >
                    Upload files
                  </button>.
                </>
              ) : (
                "You do not have permission to upload files."
              )}
            </EmptyDescription>
          </EmptyHeader>
          {canCreate && !search && typeFilter === "all" && (
            <EmptyContent>
              <Button onClick={handleUploadClick}>
                <Upload className="size-4 mr-2" />
                Upload your first file
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="relative">
          {view === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {files.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  selected={selectedIds.has(file.id)}
                  onToggleSelect={() => toggleSelect(file.id)}
                  onRename={(mediaId, name) => {
                    setRenameMediaId(mediaId);
                    setRenameName(name);
                    setRenameOpen(true);
                  }}
                  onDelete={(mediaId, name) => {
                    setDeleteMediaId(mediaId);
                    setDeleteName(name);
                    setDeleteOpen(true);
                  }}
                  onCopyUrl={copyUrl}
                  onOpen={openFile}
                  onDownload={downloadFile}
                  isImage={isImage(file)}
                />
              ))}
              {isNextLoading && <Skeleton className="h-64 w-full rounded-lg" />}
            </div>
          ) : (
            <FileListTable
              files={files}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onCopyUrl={copyUrl}
            />
          )}
          {hasMore && nextCursor && (
            <button
              type="button"
              onClick={loadMore}
              disabled={isNextLoading}
              className="mx-auto mt-6 flex items-center gap-2 px-4 py-2 border rounded-full text-sm hover:bg-muted disabled:opacity-50"
            >
              {isNextLoading ? (
                <>
                  <Clock className="size-4 animate-spin" /> Loading more…
                </>
              ) : (
                <>
                  <ArrowDown className="size-4" />
                  Load more
                </>
              )}
            </button>
          )}
        </div>
      )}

      <input
        id="file-upload-input"
        type="file"
        multiple
        hidden
        onChange={handleFilesSelected}
      />

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
            <DialogDescription>Enter a new name for the file.</DialogDescription>
          </DialogHeader>
          <Separator />
          <DialogContent className="space-y-4">
            <Label>File name</Label>
            <Input
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              autoFocus
            />
          </DialogContent>
          <DialogFooter>
            <Button onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button
              onClick={handleRename}
              disabled={!renameName.trim()}
              className="ml-auto"
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
        <DialogClose />
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete file</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete
              <span className="font-mono text-sm">{deleteName}</span>? This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <Separator />
          <DialogFooter>
            <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              onClick={handleDelete}
              className="ml-auto text-destructive focus:text-destructive"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
        <DialogClose />
      </Dialog>

      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete selected files</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedFiles.length} file(s)? This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <Separator />
          <DialogFooter>
            <Button onClick={() => setBulkDeleteOpen(false)}>Cancel</Button>
            <Button
              onClick={handleBulkDelete}
              className="ml-auto text-destructive focus:text-destructive"
            >
              Delete {selectedFiles.length}
            </Button>
          </DialogFooter>
        </DialogContent>
        <DialogClose />
      </Dialog>
    </div>
  );
}

function UploadZone({
  canCreate,
  onDrop,
  onClick,
  activeUploads,
}: {
  canCreate: boolean;
  onDrop: (files: File[]) => void;
  onClick: () => void;
  activeUploads: number;
}) {
  const [isDragActive, setIsDragActive] = React.useState(false);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };
  const onDropHandler = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) onDrop(files);
  };

  return (
    <Card
      className={cn(
        "border-2 rounded-xl p-6 text-center transition-all duration-200",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-border hover:border-border/50",
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDropHandler}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex flex-col items-center justify-center gap-2">
        <Upload className={`size-10 mb-2 ${isDragActive ? "text-primary" : "text-muted-foreground"}`} />
        {isDragActive ? (
          <p className="text-sm font-medium text-primary">Drop files here</p>
        ) : canCreate ? (
          <>
            <p className="text-sm text-muted-foreground">
              Drag and drop images, or{" "}
              <span
                className="underline underline-offset-4 font-medium hover:text-primary cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onClick(); }}
              >
                click to browse
              </span>
            </p>
            {activeUploads > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {activeUploads} upload{activeUploads !== 1 ? "s" : ""} in progress
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            You do not have permission to upload files.
          </p>
        )}
      </div>
    </Card>
  );
}

function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex items-center justify-center rounded-lg border border-input bg-background p-1 shadow-sm">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
            value === opt.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

interface FileCardProps {
  file: MediaFile;
  canUpdate: boolean;
  canDelete: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onRename: (mediaId: string, name: string) => void;
  onDelete: (mediaId: string, name: string) => void;
  onCopyUrl: (url: string) => void;
  onOpen: (url: string) => void;
  onDownload: (url: string, name: string) => void;
  isImage: boolean;
}

function FileCard({
  file,
  canUpdate,
  canDelete,
  selected,
  onToggleSelect,
  onRename,
  onDelete,
  onCopyUrl,
  onOpen,
  onDownload,
  isImage: isImageFile,
}: FileCardProps) {
  return (
    <Card
      className={cn("overflow-hidden flex flex-col", selected && "ring-2 ring-primary")}
      onClick={() => onToggleSelect()}
    >
      <CardHeader className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect()}
            aria-label={`Select ${file.name}`}
          />
          <div className="flex items-center gap-2 min-w-0">
            {fileIcon(file.contentType, file.name)}
            <div className="min-w-0">
              <div className="text-sm font-medium truncate" title={file.name}>
                {file.name}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {formatBytes(file.size)} ·
                {formatDate(file.lastModified)}
              </div>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={() => (
            <Button className="h-8 w-8 p-0" aria-label="More actions">
              <MoreHorizontal className="size-4" />
            </Button>
          )} />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onOpen(file.deliveryUrl)}>
              <ExternalLink className="size-4 mr-2" />
              Open file
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload(file.deliveryUrl, file.name)}>
              <Download className="size-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCopyUrl(file.deliveryUrl)}>
              <Copy className="size-4 mr-2" />
              Copy URL
            </DropdownMenuItem>
            {canUpdate && (
              <DropdownMenuItem onClick={() => onRename(file.id, file.name)}>
                <Edit className="size-4 mr-2" />
                Rename
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem
                onClick={() => onDelete(file.id, file.name)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      {isImageFile && (
        <CardContent className="relative aspect-video overflow-hidden bg-muted">
          <Image
            fill
            src={file.deliveryUrl}
            alt={file.name}
            className="object-cover"
            loader={(props) => props.src}
            loading="lazy"
          />
        </CardContent>
      )}
      <CardFooter className="p-3 flex justify-between items-center">
        <Badge variant="outline" className="text-xs">
          {file.contentType ?? "application/octet-stream"}
        </Badge>
        <Button size="sm" onClick={() => onCopyUrl(file.deliveryUrl)} className="w-auto">
          <Copy className="size-3 mr-1" />
          Copy
        </Button>
      </CardFooter>
    </Card>
  );
}

interface FileListTableProps {
  files: MediaFile[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onCopyUrl: (url: string) => void;
}

function FileListTable({
  files,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onCopyUrl,
}: FileListTableProps) {
  const allSelected =
    files.length > 0 && files.every((f) => selectedIds.has(f.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="h-10 text-left text-xs font-semibold text-muted-foreground">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={onToggleSelectAll}
                aria-label="Select all visible files"
              />
            </th>
            <th className="h-10 text-left text-xs font-semibold text-muted-foreground">File</th>
            <th className="h-10 text-left text-xs font-semibold text-muted-foreground">Type</th>
            <th className="h-10 text-left text-xs font-semibold text-muted-foreground">Size</th>
            <th className="h-10 text-left text-xs font-semibold text-muted-foreground">Uploaded</th>
            <th className="h-10 text-right text-xs font-semibold text-muted-foreground pr-4">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {files.map((file) => (
            <tr key={file.id} className={cn("group", selectedIds.has(file.id) && "bg-muted/50")}>
              <td className="h-10">
                <Checkbox
                  checked={selectedIds.has(file.id)}
                  onCheckedChange={() => onToggleSelect(file.id)}
                  aria-label={`Select ${file.name}`}
                />
              </td>
              <td className="h-10 flex items-center gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {fileIcon(file.contentType, file.name)}
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" title={file.name}>
                      {file.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {formatBytes(file.size)} ·
                      {formatDate(file.lastModified)}
                    </div>
                  </div>
                </div>
              </td>
              <td className="h-10">
                <Badge variant="outline" className="text-xs">
                  {file.contentType ?? "application/octet-stream"}
                </Badge>
              </td>
              <td className="h-10 text-muted-foreground">{formatBytes(file.size)}</td>
              <td className="h-10 text-muted-foreground">{formatDate(file.lastModified)}</td>
              <td className="h-10 text-right pr-4">
                <Button size="sm" onClick={(e) => { e.stopPropagation(); onCopyUrl(file.deliveryUrl); }} className="w-auto p-1">
                  <Copy className="size-3" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
