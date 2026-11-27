"use client";

import * as React from "react";
import Image from "next/image";
import { toast } from "@zerocraft/ui/toast";

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
import { Input } from "@zerocraft/ui/input";
import { Label } from "@zerocraft/ui/label";
import { Button } from "@zerocraft/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@zerocraft/ui/card";
import {
  registerMediaFile,
  deleteMediaFile,
} from "@/app/(dashboard)/content/files/actions";
import {
  Folder,
  Upload,
  Trash2,
  Copy,
  Search,
  ExternalLink,
  Plus,
  MoreHorizontal,
  Clock,
  RefreshCw,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@zerocraft/ui/select";

export type PickedMedia = {
  id: string;
  key: string;
  name: string;
  url: string;
  visibility?: "public" | "private";
  contentType: string | null;
  size: number;
  organizationId: string;
};

interface MediaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  multiple?: boolean;
  maxSelection?: number;
  acceptedTypes?: ("image" | "video" | "document" | "other")[];
  selectedMedia?: PickedMedia[];
  onConfirm: (media: PickedMedia[]) => void;
  onCancel?: () => void;
  disabled?: boolean;
  /** Asset folder for new uploads (e.g. "products" or "uploads"). Defaults to "uploads". */
  folder?: string;
}

const API_BASE = "/api/content/files";
const PAGE_SIZE = 50;

const TYPE_LABELS: Record<string, string> = {
  image: "Images",
  video: "Videos",
  document: "Documents",
  other: "Other",
};

function isImage(f: MediaFile) {
  return Boolean(f.contentType?.startsWith("image/"));
}

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

export function MediaPicker({
  open,
  onOpenChange,
  multiple = false,
  maxSelection,
  acceptedTypes,
  selectedMedia: initialSelected = [],
  onConfirm,
  disabled = false,
  folder = "uploads",
}: MediaPickerProps) {
  const [files, setFiles] = React.useState<MediaFile[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [sort] = React.useState("newest");
  const [uploads, setUploads] = React.useState<UploadItem[]>([]);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isNextLoading, setIsNextLoading] = React.useState(false);

  // Selected IDs, seeded from initialSelected.
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    new Set(initialSelected.map((m) => m.id)),
  );

  const isTypeAllowed = (type: string) => {
    if (!acceptedTypes || acceptedTypes.length === 0) return true;
    return acceptedTypes.includes(
      type as "image" | "video" | "document" | "other",
    );
  };

  const buildParams = React.useCallback(() => {
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    if (nextCursor) params.set("cursor", nextCursor);
    if (search) params.set("search", search);
    if (typeFilter !== "all") params.set("type", typeFilter);
    params.set("sort", sort);
    return params;
  }, [nextCursor, search, typeFilter, sort]);

  const loadFiles = React.useCallback(async (resetCursor = true) => {
    if (resetCursor) {
      setNextCursor(null);
      setHasMore(false);
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}?${buildParams().toString()}`);
      if (!res.ok) throw new Error("Failed to load files");
      const data = await res.json();
      if (resetCursor) setFiles(data.files ?? []);
      else setFiles((prev) => [...prev, ...(data.files ?? [])]);
      setNextCursor(data.nextCursor ?? null);
      setHasMore(Boolean(data.hasMore));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      setIsNextLoading(false);
    }
  }, [buildParams]);

  const loadMore = async () => {
    if (!nextCursor || isNextLoading || !hasMore) return;
    setIsNextLoading(true);
    try {
      const res = await fetch(`${API_BASE}?${buildParams().toString()}`);
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
    if (open) loadFiles(true);
  }, [open, loadFiles]);

  // Re-seed selection when initialSelected changes externally.
  React.useEffect(() => {
    setSelectedIds(new Set(initialSelected.map((m) => m.id)));
  }, [initialSelected]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!multiple) {
          next.clear();
          next.add(id);
        } else {
          const limit = maxSelection ?? Infinity;
          if (next.size >= limit) return next;
          next.add(id);
        }
      }
      return next;
    });
  };

  const selectedMedia = files.filter((f) => selectedIds.has(f.id));
  const atLimit =
    multiple && maxSelection ? selectedIds.size >= maxSelection : false;

  const handleConfirm = () => {
    const picked = selectedMedia.map((f) => ({
      id: f.id,
      key: f.key,
      name: f.name,
      url: f.deliveryUrl,
      visibility: f.visibility,
      contentType: f.contentType,
      size: f.size,
      organizationId: f.organizationId,
    }));
    onConfirm(picked);
    onOpenChange(false);
  };

  // ---- Upload ----
  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.length === 0) return;
    await startUploads(selected.filter((f) => isTypeAllowed(categoryFromType(f.type))));
  };

  function categoryFromType(contentType: string): string {
    const t = contentType.toLowerCase();
    if (t.startsWith("image/")) return "image";
    if (t.startsWith("video/")) return "video";
    if (t === "application/pdf") return "document";
    return "other";
  }

  const startUploads = async (fileList: File[]) => {
    if (fileList.length === 0) return;
    const items: UploadItem[] = fileList.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      status: "pending",
      progress: 0,
      error: null,
    }));
    setUploads((prev) => [...prev, ...items]);
    for (const item of items) await uploadFile(item);
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
          folder,
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
      if (!registerResult.ok) throw new Error(registerResult.error);
      setUploads((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "done", progress: 100 } : i)),
      );
      await loadFiles(true);
      toast.add({ title: `“${file.name}” uploaded.`, type: "success" });
    } catch (err) {
      setUploads((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status: "error", error: err instanceof Error ? err.message : "Upload failed" }
            : i,
        ),
      );
      toast.add({ title: `Failed to upload “${file.name}”.`, type: "error" });
    }
  };

  const handleDelete = async (mediaId: string) => {
    try {
      const result = await deleteMediaFile({ mediaId });
      if (result.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== mediaId));
        setSelectedIds((prev) => { const n = new Set(prev); n.delete(mediaId); return n; });
        toast.add({ title: "File deleted.", type: "success" });
      } else {
        toast.add({ title: result.error, type: "error" });
      }
    } catch {
      toast.add({ title: "Failed to delete file.", type: "error" });
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => toast.add({ title: "URL copied.", type: "success" }));
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] sm:max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select media</DialogTitle>
          <DialogDescription>
            Choose files from the media library or upload new ones.
          </DialogDescription>
        </DialogHeader>
        <Separator className="my-3" />

        <div className="flex flex-col gap-3 overflow-y-auto flex-1">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Search className="size-4 text-muted-foreground" />
              <Input
                placeholder="Search media…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64 pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Type</Label>
              <div className="w-auto">
                <Select
                  value={typeFilter}
                  onValueChange={(v) => setTypeFilter(v ?? "all")}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All files</SelectItem>
                    {Object.entries(TYPE_LABELS)
                      .filter(([k]) => k !== "all")
                      .map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <input
                id="picker-upload-input"
                type="file"
                multiple
                className="hidden"
                aria-label="Upload media files"
                disabled={disabled}
                onChange={handleFilesSelected}
              />
              <Button
                onClick={() => setIsRefreshing(true)}
                disabled={isRefreshing}
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
              <Button
                onClick={() => document.getElementById("picker-upload-input")?.click()}
                disabled={disabled}
              >
                <Plus className="size-4 mr-2" />
                Upload
              </Button>
            </div>
          </div>

          {/* Upload progress */}
          {uploads.some((u) => u.status === "uploading") && (
            <Card className="mt-2">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="size-4" />
                  Uploading
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-3">
                {uploads.filter((u) => u.status === "uploading").map((u) => (
                  <div key={u.id} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span className="truncate" title={u.file.name}>{u.file.name}</span>
                      <span className="text-muted-foreground">{u.progress}%</span>
                    </div>
                    <Progress value={u.progress} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Files */}
          {files.length === 0 && !loading ? (
            <Empty className="border-0 p-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Folder className="size-16 mb-4 opacity-50" />
                </EmptyMedia>
                <EmptyTitle>
                  {search || typeFilter !== "all" ? "No matching files" : "No media yet"}
                </EmptyTitle>
                <EmptyDescription>
                  Upload a file to get started.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={() => document.getElementById("picker-upload-input")?.click()}>
                  <Upload className="size-4 mr-2" />
                  Upload your first file
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {files.map((file) => {
                const sel = selectedIds.has(file.id);
                const disabledSelect = !sel && atLimit && !multiple;
                return (
                  <PickerCard
                    key={file.id}
                    file={file}
                    selected={sel}
                    disabledSelect={disabledSelect}
                    onToggleSelect={() => toggleSelect(file.id)}
                    onDelete={(id) => handleDelete(id)}
                    onCopyUrl={copyUrl}
                    isImage={isImage(file)}
                    canUse={isTypeAllowed(categoryFromType(file.contentType ?? ""))}
                  />
                );
              })}
              {isNextLoading && <Skeleton className="h-64 w-full rounded-lg" />}
            </div>
          )}

          {hasMore && nextCursor && (
            <button
              type="button"
              onClick={loadMore}
              disabled={isNextLoading}
              className="mx-auto mt-4 flex items-center gap-2 px-4 py-2 border rounded-full text-sm hover:bg-muted disabled:opacity-50"
            >
              {isNextLoading ? (
                <span className="flex items-center gap-2"><Clock className="size-4 animate-spin" /> Loading more…</span>
              ) : (
                <span><ArrowDown className="size-4" /> Load more</span>
              )}
            </button>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between">
            {selectedMedia.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {selectedMedia.length} selected
              </span>
            )}
            <Button onClick={onOpenChange.bind(null, false)}>Cancel</Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedMedia.length === 0 || disabled}
            >
              {multiple ? "Select" : "Select"} {selectedMedia.length === 1 ? "file" : "files"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
      <DialogClose />
    </Dialog>
  );
}

interface PickerCardProps {
  file: MediaFile;
  selected: boolean;
  disabledSelect: boolean;
  onToggleSelect: () => void;
  onDelete: (mediaId: string, name: string) => void;
  onCopyUrl: (url: string) => void;
  isImage: boolean;
  canUse: boolean;
}

function PickerCard({
  file,
  selected,
  disabledSelect,
  onToggleSelect,
  onDelete,
  onCopyUrl,
  isImage: isImageFile,
  canUse,
}: PickerCardProps) {
  return (
    <Card className={cn("overflow-hidden flex flex-col cursor-pointer", selected && "ring-2 ring-primary")}>
      <CardHeader className="p-3 flex items-center justify-between">
        <Checkbox
          checked={selected}
          disabled={disabledSelect}
          onCheckedChange={onToggleSelect}
          aria-label={`Select ${file.name}`}
        />
        <DropdownMenu>
          <DropdownMenuTrigger render={() => (
            <Button className="h-8 w-8 p-0" aria-label="More actions">
              <MoreHorizontal className="size-4" />
            </Button>
          )} />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onCopyUrl(file.deliveryUrl)}>
              <Copy className="size-4 mr-2" />
              Copy URL
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(file.deliveryUrl, "_blank")}>
              <ExternalLink className="size-4 mr-2" />
              Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(file.id, file.name)} className="text-destructive focus:text-destructive">
              <Trash2 className="size-4 mr-2" />
              Delete
            </DropdownMenuItem>
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
            loading="lazy"
          />
        </CardContent>
      )}
      <CardFooter className="p-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{file.contentType ?? "application/octet-stream"}</Badge>
          {!canUse && <Badge variant="destructive" className="text-xs" title="Type not allowed for this picker">Not allowed</Badge>}
        </div>
        <Button size="sm" onClick={(e) => { e.stopPropagation(); onCopyUrl(file.deliveryUrl); }} className="w-auto">
          <Copy className="size-3 mr-1" />
          Copy
        </Button>
      </CardFooter>
    </Card>
  );
}

type UploadItem = {
  id: string;
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error: string | null;
};
