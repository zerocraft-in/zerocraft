"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  CloudUpload,
  Copy,
  ClipboardPaste,
  ExternalLink,
  FileImage,
  FileText,
  Film,
  Folder,
  FolderOpen,
  FolderPlus,
  HardDrive,
  Image as ImageIcon,
  Music,
  Pencil,
  RefreshCw,
  Search,
  Scissors,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Badge } from "@zerocraft/ui/components/badge";
import { Button } from "@zerocraft/ui/components/button";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@zerocraft/ui/components/attachment";
import { Card, CardHeader, CardTitle } from "@zerocraft/ui/components/card";
import { StudioLoadTransition } from "@/components/studio-loading";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@zerocraft/ui/components/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@zerocraft/ui/components/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@zerocraft/ui/components/empty";
import { Input } from "@zerocraft/ui/components/input";
import { Checkbox } from "@zerocraft/ui/components/checkbox";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@zerocraft/ui/components/menubar";
import { SelectField } from "@zerocraft/ui/components/select-field";
import { Spinner } from "@zerocraft/ui/components/spinner";
import { Textarea } from "@zerocraft/ui/components/textarea";
import { studioToast } from "@/lib/studio-toast";
import { useStudioAppearance } from "@/components/providers/studio-appearance-provider";
import { readableAccentForeground } from "@/lib/studio-appearance";

const MAX_UPLOAD_BYTES = 250 * 1024 * 1024;

/** base-ui Select rejects empty values, so "studio root" uses a sentinel. */
const ROOT_FOLDER_VALUE = "::studio-root::";
const folderSelectValue = (folder: string | undefined) => folder || ROOT_FOLDER_VALUE;

type ViewMode = "grid" | "list";
type SortMode = "recent" | "oldest" | "size" | "name";

type Asset = {
  key: string;
  fileName: string;
  folder: string;
  sizeBytes: number;
  altText: string;
  mimeType: string;
  type: string;
  lastModified: string | null;
  publicUrl: string | null;
};

type FolderEntry = { name: string; count: number; bytes: number };

type MediaData = {
  configured: boolean;
  bucket: string;
  capacityBytes: number;
  publicBaseUrlConfigured?: boolean;
  publicBaseUrl?: string | null;
  storage?: { usedBytes: number; objectCount: number; folderCount: number; largestFolder: string | null };
  folders?: FolderEntry[];
  assets?: Asset[];
};

type MediaReference = { id: string; source: string; label: string; detail: string; href: string };

type UploadItem = { id: string; name: string; folder: string; progress: number; status: "uploading" | "done" | "error"; error?: string };

type Connection = "loading" | "connected" | "disconnected" | "error";

type DeleteDialogState =
  | { open: false }
  | { open: true; asset: Asset; phase: "checking" | "confirm" | "blocked" | "deleting"; references: MediaReference[]; error: string };

const focusRing =
  "focus-visible:border-[var(--brand-accent)] focus-visible:ring-3 focus-visible:ring-[color-mix(in_srgb,var(--brand-accent)_25%,transparent)]";

function formatBytes(value: number) {
  if (value <= 0) return "0 B";
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(1)} GB`;
}

function previewClass(type: string) {
  return type === "Video"
    ? "bg-[linear-gradient(160deg,#ff8a4c,#9b2a1a_60%,#1a0d0d)]"
    : type === "Image" || type === "SVG"
      ? "bg-[radial-gradient(circle_at_30%_30%,#f2c28b,#3b2a2a_80%)]"
      : type === "Audio"
        ? "bg-[linear-gradient(180deg,#2a2530,#121014)]"
        : "bg-[#ececee] text-black";
}

const setupSteps = [
  {
    title: "Create the R2 bucket",
    detail: "Cloudflare dashboard → R2 → Create bucket (e.g. zerocraft-media). Enable public access via a custom domain or r2.dev.",
  },
  {
    title: "Create an S3 API token",
    detail: "R2 → Manage R2 API tokens → Object Read & Write, scoped to the media bucket.",
  },
  {
    title: "Set the server credentials",
    detail: "Add the environment variables below to apps/studio/.env (account ID, access key, secret).",
  },
  {
    title: "Publish a public base URL",
    detail: "Set CLOUDFLARE_R2_PUBLIC_BASE_URL to the bucket's custom domain so the site can render images.",
  },
  {
    title: "Restart the app",
    detail: "Environment variables load on boot. Press “Check again” once they are set.",
  },
];

export default function StudioMediaPage() {
  const { appearance } = useStudioAppearance();
  const accent = appearance.accentColor;
  const accentForeground = readableAccentForeground(accent);

  const [connection, setConnection] = useState<Connection>("loading");
  const [data, setData] = useState<MediaData | null>(null);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [references, setReferences] = useState<MediaReference[] | null>(null);

  const [folder, setFolder] = useState("all");
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortMode>("recent");
  const [uploadFolder, setUploadFolder] = useState("general");
  const [selectedAssetKeys, setSelectedAssetKeys] = useState<Set<string>>(() => new Set());
  const [assetClipboard, setAssetClipboard] = useState<{ mode: "copy" | "cut"; assets: Asset[] }>({ mode: "copy", assets: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [copied, setCopied] = useState(false);

  const [altText, setAltText] = useState("");
  const [savingMetadata, setSavingMetadata] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [renameText, setRenameText] = useState("");
  const [renameFolder, setRenameFolder] = useState(ROOT_FOLDER_VALUE);
  const [savingRename, setSavingRename] = useState(false);

  const [folderDialog, setFolderDialog] = useState<{ mode: "create" | "rename"; oldName?: string } | null>(null);
  const [folderName, setFolderName] = useState("");
  const [savingFolder, setSavingFolder] = useState(false);

  const [deleteState, setDeleteState] = useState<DeleteDialogState>({ open: false });

  const assets = useMemo(() => data?.assets ?? [], [data]);
  const folders = useMemo(() => data?.folders ?? [], [data]);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/studio/media", { cache: "no-store" });
      const payload = (await response.json()) as MediaData & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not read Cloudflare R2.");
      if (!payload.configured) {
        setConnection("disconnected");
        setData(payload);
        setSelected(null);
        return;
      }
      setConnection("connected");
      setData(payload);
      const currentKeys = new Set((payload.assets ?? []).map((asset) => asset.key));
      setSelectedAssetKeys((current) => new Set([...current].filter((key) => currentKeys.has(key))));
      setSelected((current) =>
        current && (payload.assets ?? []).some((asset) => asset.key === current.key)
          ? current
          : (payload.assets?.[0] ?? null),
      );
    } catch (caught) {
      setConnection("error");
      setData(null);
      setError(caught instanceof Error ? caught.message : "Could not read Cloudflare R2.");
    } finally {
      setLoading(false);
    }
  }, [setConnection, setData, setError, setLoading, setSelected]);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  useEffect(() => {
    setView((window.localStorage.getItem("zc-media-view") as ViewMode | null) ?? "grid");
    setSort((window.localStorage.getItem("zc-media-sort") as SortMode | null) ?? "recent");
  }, []);
  useEffect(() => { window.localStorage.setItem("zc-media-view", view); }, [view]);
  useEffect(() => { window.localStorage.setItem("zc-media-sort", sort); }, [sort]);

  useEffect(() => {
    setUploadFolder(folder === "all" ? uploadFolder : folder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder]);

  useEffect(() => { setAltText(selected?.altText ?? ""); setRenameText(selected?.fileName ?? ""); setRenameFolder(folderSelectValue(selected?.folder)); setEditingName(false); }, [selected?.key, selected?.fileName, selected?.folder, selected?.altText]);

  useEffect(() => {
    if (!selected) { setReferences(null); return; }
    let cancelled = false;
    setReferences(null);
    (async () => {
      try {
        const response = await fetch(`/api/studio/media/references?key=${encodeURIComponent(selected.key)}`, { cache: "no-store" });
        const payload = await response.json();
        if (cancelled) return;
        setReferences(response.ok ? payload.references ?? [] : []);
      } catch {
        if (!cancelled) setReferences([]);
      }
    })();
    return () => { cancelled = true; };
    // Re-scans when the selected asset changes, not on alt-text edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.key]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = assets.filter(
      (asset) =>
        (folder === "all" || (folder === ROOT_FOLDER_VALUE ? !asset.folder : asset.folder === folder))
        && (filter === "All" || asset.type === filter || (filter === "Docs" && asset.type === "Doc"))
        && (!term
          || asset.fileName.toLowerCase().includes(term)
          || asset.altText.toLowerCase().includes(term)),
    );
    const stamp = (asset: Asset) => (asset.lastModified ? new Date(asset.lastModified).getTime() : 0);
    return list.sort((a, b) => {
      if (sort === "size") return b.sizeBytes - a.sizeBytes;
      if (sort === "name") return a.fileName.localeCompare(b.fileName);
      if (sort === "oldest") return stamp(a) - stamp(b);
      return stamp(b) - stamp(a);
    });
  }, [assets, folder, filter, query, sort]);

  const capacityBytes = data?.capacityBytes ?? 10 * 1024 ** 3;
  const usedBytes = data?.storage?.usedBytes ?? assets.reduce((sum, asset) => sum + asset.sizeBytes, 0);
  const storagePercent = Math.min(100, Math.round((usedBytes / capacityBytes) * 1000) / 10);
  const topFolders = folders.slice().sort((a, b) => b.bytes - a.bytes).slice(0, 3);

  function changeFolder(next: string) {
    setFolder(next);
    if (next !== "all") setUploadFolder(next);
  }

  const uploadTargetRef = useRef(uploadFolder);
  useEffect(() => { uploadTargetRef.current = uploadFolder; }, [uploadFolder]);
  const didUploadRef = useRef(false);

  const uploadOne = useCallback((file: File) => new Promise<void>((resolve) => {
    const id = `upload-${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`;
    const targetFolder = uploadTargetRef.current;
    setUploads((current) => [...current, { id, name: file.name, folder: targetFolder, progress: 0, status: "uploading" }]);
    const form = new FormData();
    form.set("file", file);
    form.set("folder", targetFolder === ROOT_FOLDER_VALUE ? "" : targetFolder);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/studio/media");
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const progress = Math.round((event.loaded / event.total) * 100);
      setUploads((current) => current.map((item) => (item.id === id ? { ...item, progress } : item)));
    };
    xhr.onload = () => {
      let payload: { error?: string } = {};
      try { payload = JSON.parse(xhr.responseText) as { error?: string }; } catch {}
      if (xhr.status >= 200 && xhr.status < 300) {
        didUploadRef.current = true;
        setUploads((current) => current.map((item) => (item.id === id ? { ...item, progress: 100, status: "done" } : item)));
        window.setTimeout(() => {
          setUploads((current) => current.filter((item) => item.id !== id));
        }, 5000);
      } else {
        setUploads((current) => current.map((item) => (item.id === id ? { ...item, status: "error", error: payload.error ?? `Upload failed (${xhr.status}).` } : item)));
      }
      resolve();
    };
    xhr.onerror = () => {
      setUploads((current) => current.map((item) => (item.id === id ? { ...item, status: "error", error: "Network error while uploading." } : item)));
      resolve();
    };
    xhr.send(form);
  }), [setUploads]);

  const onDrop = useCallback(async (accepted: File[], rejected: FileRejection[]) => {
    setError("");
    if (rejected.length) {
      const [first] = rejected;
      const tooLarge = first?.errors?.some((item) => item.code === "file-too-large");
      setError(
        tooLarge
          ? `${first.file.name} is over the 250 MB limit.`
          : `${rejected.length} file${rejected.length === 1 ? "" : "s"} could not be uploaded.`,
      );
    }
    if (!accepted.length) return;
    for (const file of accepted) await uploadOne(file);
    if (didUploadRef.current) {
      didUploadRef.current = false;
      await loadAssets();
      const count = accepted.length;
      const target = uploadTargetRef.current;
      studioToast.success(
        "Upload complete",
        `Uploaded ${count} file${count === 1 ? "" : "s"} to ${target === ROOT_FOLDER_VALUE ? "studio/" : `studio/${target}/`}`,
      );
    }
  }, [loadAssets, uploadOne]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    open: openFilePicker,
  } = useDropzone({
    noClick: true,
    noKeyboard: true,
    maxSize: MAX_UPLOAD_BYTES,
    onDrop: (accepted, rejected) => void onDrop(accepted, rejected),
  });

  useEffect(() => {
    if (connection !== "connected") return;
    function onPaste(event: ClipboardEvent) {
      if (event.clipboardData?.files.length) {
        const files = Array.from(event.clipboardData.files).filter((file) => file.size > 0);
        if (files.length) void onDrop(files, []);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [connection, onDrop]);

  const selectedAssets = useMemo(
    () => assets.filter((asset) => selectedAssetKeys.has(asset.key)),
    [assets, selectedAssetKeys],
  );
  const visibleSelectedCount = visible.reduce((count, asset) => count + Number(selectedAssetKeys.has(asset.key)), 0);

  function toggleAssetSelection(asset: Asset) {
    setSelectedAssetKeys((current) => {
      const next = new Set(current);
      if (next.has(asset.key)) next.delete(asset.key);
      else next.add(asset.key);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedAssetKeys((current) => {
      const allSelected = visible.length > 0 && visible.every((asset) => current.has(asset.key));
      return allSelected ? new Set() : new Set(visible.map((asset) => asset.key));
    });
  }

  const copySelectedAssets = useCallback((mode: "copy" | "cut") => {
    if (!selectedAssets.length) return;
    setAssetClipboard({ mode, assets: selectedAssets });
    studioToast.info(
      `${mode === "copy" ? "Copied" : "Cut"} ${selectedAssets.length} file${selectedAssets.length === 1 ? "" : "s"}`,
      "Choose a destination folder and paste to continue.",
    );
  }, [selectedAssets]);

  const pasteAssets = useCallback(async () => {
    if (!assetClipboard.assets.length) return;
    const targetFolder = uploadFolder === ROOT_FOLDER_VALUE ? "" : uploadFolder;
    const pending = assetClipboard.assets;
    const failures: string[] = [];
    let completed = 0;
    let skipped = 0;
    for (const asset of pending) {
      if (assetClipboard.mode === "cut" && asset.folder === targetFolder) {
        skipped += 1;
        setAssetClipboard((current) => ({ ...current, assets: current.assets.filter((item) => item.key !== asset.key) }));
        continue;
      }
      try {
        const response = await fetch(`/api/studio/media?key=${encodeURIComponent(asset.key)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(assetClipboard.mode === "copy"
            ? { operation: "copy", folder: targetFolder }
            : { folder: targetFolder }),
        });
        const payload = await response.json() as { error?: string; key?: string };
        if (!response.ok) throw new Error(payload.error ?? `Could not ${assetClipboard.mode} ${asset.fileName}.`);
        completed += 1;
        if (assetClipboard.mode === "cut") {
          setAssetClipboard((current) => ({ ...current, assets: current.assets.filter((item) => item.key !== asset.key) }));
        }
      } catch (caught) {
        failures.push(`${asset.fileName}: ${caught instanceof Error ? caught.message : "operation failed"}`);
      }
    }
    setSelectedAssetKeys(new Set());
    await loadAssets();
    if (failures.length) {
      setError(`${completed} of ${pending.length} files processed. ${failures.join(" ")}`);
    } else {
      const action = assetClipboard.mode === "copy" ? "Copied" : "Moved";
      const skippedMessage = skipped ? ` ${skipped} already in that folder.` : "";
      studioToast.success(
        `${action} ${completed} file${completed === 1 ? "" : "s"}`,
        `Destination: ${targetFolder ? `studio/${targetFolder}/` : "studio/"}${skippedMessage}`,
      );
      if (assetClipboard.mode === "copy") setAssetClipboard({ mode: "copy", assets: [] });
    }
  }, [assetClipboard, uploadFolder, loadAssets]);

  useEffect(() => {
    if (connection !== "connected") return;
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const target = event.target;
      const key = event.key.toLowerCase();
      if (key === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select, [contenteditable='true']"))) return;
      if (key === "a") {
        event.preventDefault();
        setSelectedAssetKeys(new Set(visible.map((asset) => asset.key)));
      } else if (key === "c" || key === "x") {
        if (!selectedAssets.length) return;
        event.preventDefault();
        copySelectedAssets(key === "c" ? "copy" : "cut");
      } else if (key === "v" && assetClipboard.assets.length) {
        event.preventDefault();
        void pasteAssets();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [connection, visible, selectedAssets, assetClipboard, pasteAssets, copySelectedAssets]);

  async function saveMetadata() {
    if (!selected) return;
    setSavingMetadata(true);
    setError("");
    try {
      const response = await fetch(`/api/studio/media?key=${encodeURIComponent(selected.key)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ altText }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not update metadata.");
      const nextAlt = payload.altText ?? altText;
      studioToast.success("Alt text updated");
      setSelected((current) => (current ? { ...current, altText: nextAlt } : current));
      setData((current) => (current ? { ...current, assets: (current.assets ?? []).map((asset) => (asset.key === selected.key ? { ...asset, altText: nextAlt } : asset)) } : current));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update metadata.");
    } finally {
      setSavingMetadata(false);
    }
  }

  async function saveRename() {
    if (!selected) return;
    const wanted = renameText.trim();
    if (!wanted) return;
    const targetFolder = renameFolder === ROOT_FOLDER_VALUE ? "" : renameFolder;
    const nameChanged = wanted !== selected.fileName;
    const folderChanged = targetFolder !== (selected.folder ?? "");
    if (!nameChanged && !folderChanged) return;
    setSavingRename(true);
    setError("");
    try {
      const body: Record<string, string> = {};
      if (nameChanged) body.fileName = wanted;
      if (folderChanged) body.folder = targetFolder;
      const response = await fetch(`/api/studio/media?key=${encodeURIComponent(selected.key)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as { error?: string; key?: string; fileName?: string; folder?: string; references?: MediaReference[] };
      if (!response.ok) throw new Error(payload.error ?? "Could not rename the asset.");
      const nextName = payload.fileName ?? wanted;
      const nextKey = payload.key ?? selected.key;
      studioToast.success(
        folderChanged && nameChanged
          ? `Renamed and moved to ${payload.folder || "studio/"}`
          : folderChanged
            ? `Moved to ${payload.folder || "studio/"}`
            : `Renamed to ${nextName}`,
        "The asset URL changed. Copy the new URL anywhere it is used.",
      );
      setSelected((current) => (current ? { ...current, key: nextKey, fileName: nextName, folder: payload.folder ?? current.folder } : current));
      setEditingName(false);
      await loadAssets();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not rename the asset.");
    } finally {
      setSavingRename(false);
    }
  }

  function openFolderDialog(mode: "create" | "rename") {
    setFolderName(mode === "rename" ? folder : "");
    setFolderDialog({ mode, oldName: mode === "rename" ? folder : undefined });
  }

  async function saveFolder() {
    if (!folderDialog) return;
    setSavingFolder(true);
    setError("");
    try {
      const create = folderDialog.mode === "create";
      const response = await fetch("/api/studio/media/folders", {
        method: create ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(create ? { name: folderName } : { oldName: folderDialog.oldName, newName: folderName }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not save folder.");
      setFolderDialog(null);
      setFolderName("");
      studioToast.success(
        create ? "Folder created" : "Folder renamed",
        payload.folder,
      );
      if (!create && payload.folder) { setFolder(payload.folder); setUploadFolder(payload.folder); }
      await loadAssets();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save folder.");
    } finally {
      setSavingFolder(false);
    }
  }

  async function removeFolder() {
    if (folder === "all" || folder === ROOT_FOLDER_VALUE || folder === "general") return;
    try {
      const response = await fetch(`/api/studio/media/folders?name=${encodeURIComponent(folder)}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Folder delete failed.");
      changeFolder("all");
      if (uploadFolder === folder) setUploadFolder("general");
      studioToast.success("Folder deleted", `Removed the empty ${folder} folder.`);
      await loadAssets();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Folder delete failed.");
    }
  }

  async function startDelete(asset: Asset) {
    setDeleteState({ open: true, asset, phase: "checking", references: [], error: "" });
    try {
      const response = await fetch(`/api/studio/media/references?key=${encodeURIComponent(asset.key)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not check references.");
      const list: MediaReference[] = payload.references ?? [];
      setDeleteState({ open: true, asset, phase: list.length ? "blocked" : "confirm", references: list, error: "" });
    } catch (caught) {
      setDeleteState({ open: true, asset, phase: "confirm", references: [], error: caught instanceof Error ? caught.message : "" });
    }
  }

  const sidebar = (
    <aside aria-label="Media folders and storage" className="flex h-auto max-h-none min-h-0 w-full shrink-0 flex-col gap-4 rounded-xl border border-border bg-card/80 p-4 text-sm text-card-foreground shadow-none backdrop-blur-xl xl:sticky xl:top-4 xl:col-start-1 xl:row-start-1 xl:h-fit xl:max-h-[calc(100dvh-2rem)] xl:w-[250px]">
      <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground transition-colors focus-within:ring-2 focus-within:ring-ring/40">
        <Search size={15} className="shrink-0" />
        <Input
          ref={searchInputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search assets and alt text"
          aria-label="Search assets"
          className="h-full min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0"
        />
        {!query && <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">Ctrl/⌘ K</kbd>}
        {query && (
          <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="text-muted-foreground transition-colors hover:text-foreground">
            <X size={14} />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-card-foreground">Folders</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Inside studio/</p>
        </div>
        <Menubar className="h-8 items-center rounded-lg border-border bg-background">
          <MenubarMenu>
            <MenubarTrigger aria-label="Folder actions" className="px-2 text-zinc-300">
              <FolderPlus size={16} />
            </MenubarTrigger>
            <MenubarContent>
              <MenubarLabel>Folder actions</MenubarLabel>
              <MenubarItem onClick={() => openFolderDialog("create")}>
                <FolderPlus />New folder
              </MenubarItem>
              <MenubarItem disabled={folder === "all" || folder === ROOT_FOLDER_VALUE || folder === "general"} onClick={() => openFolderDialog("rename")}>
                <Pencil />Rename folder
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onClick={() => void loadAssets()}>
                <RefreshCw />Refresh
              </MenubarItem>
              <MenubarItem variant="destructive" disabled={folder === "all" || folder === ROOT_FOLDER_VALUE || folder === "general"} onClick={() => void removeFolder()}>
                <Trash2 />Delete empty folder
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>
      <div className="min-h-0 max-h-44 space-y-1 overflow-y-auto">
        <button
          onClick={() => changeFolder("all")}
          className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors ${
            folder === "all" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <FolderOpen size={16} />
          All media
          <span className="ml-auto text-xs tabular-nums opacity-70">{data?.storage?.objectCount ?? assets.length}</span>
        </button>
        <button
          onClick={() => changeFolder(ROOT_FOLDER_VALUE)}
          className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors ${
            folder === ROOT_FOLDER_VALUE ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Folder size={16} />
          Studio root
          <span className="ml-auto text-xs tabular-nums opacity-70">{assets.filter((asset) => !asset.folder).length}</span>
        </button>
        {folders.map((entry) => (
          <button
            key={entry.name}
            onClick={() => changeFolder(entry.name)}
            className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors ${
              folder === entry.name ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Folder size={16} />
            <span className="truncate">{entry.name}</span>
            <span className="ml-auto shrink-0 text-xs tabular-nums opacity-70">{entry.count}</span>
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-background/70 p-3.5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <HardDrive size={15} className="text-muted-foreground" />
          Storage
          <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">{storagePercent}%</span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {formatBytes(usedBytes)} of {formatBytes(capacityBytes)} · {data?.storage?.objectCount ?? assets.length} files
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${Math.max(usedBytes > 0 ? 2 : 0, storagePercent)}%`, backgroundColor: accent }}
          />
        </div>
        {topFolders.length > 1 && (
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            {topFolders.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-20 truncate">{entry.name}</span>
                <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.max(4, Math.round((entry.bytes / Math.max(1, usedBytes)) * 100))}%` }} />
                </div>
                <span className="shrink-0 tabular-nums">{formatBytes(entry.bytes)}</span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Folder size={12} />{data?.bucket || "zerocraft-media"}
        </p>
        <Badge
          variant="outline"
          className={`mt-2 gap-1.5 border-border text-[10px] ${
            data?.publicBaseUrlConfigured ? "text-emerald-700 dark:text-emerald-200" : "text-amber-700 dark:text-amber-200"
          }`}
        >
          <span className={`size-1.5 rounded-full ${data?.publicBaseUrlConfigured ? "bg-emerald-500" : "bg-amber-500"}`} />
          {data?.publicBaseUrlConfigured ? "Public base URL ready" : "Public base URL missing"}
        </Badge>
      </div>
    </aside>
  );

  return (
    <div
      {...getRootProps()}
    className="relative -mx-8 -mb-10 grid min-h-[calc(100vh-93px)] grid-cols-1 items-start gap-4 overflow-x-clip p-4 max-md:-mx-4 max-md:p-3 xl:grid-cols-[250px_minmax(0,1fr)] 2xl:grid-cols-[250px_minmax(0,1fr)_360px]"
    >
      <input {...getInputProps()} />
      {sidebar}

      <section aria-label="Media library" className="relative z-10 min-w-0 w-full px-0 pt-0 xl:col-start-2 xl:row-start-1 2xl:col-start-2 2xl:row-start-1">
        {isDragActive && (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-4 z-40 grid place-items-center rounded-2xl border-2 border-dashed bg-background/85 text-foreground shadow-2xl backdrop-blur-md"
            style={{ borderColor: accent }}
          >
            <div className="flex flex-col items-center gap-2 text-sm font-medium">
              <CloudUpload size={28} style={{ color: accent }} />
              Drop files to upload to {uploadFolder === ROOT_FOLDER_VALUE ? "studio/" : `studio/${uploadFolder}/`}
            </div>
          </div>
        )}

        {connection === "error" && (
          <Empty className="mt-10 rounded-xl border border-destructive/20 bg-destructive/5 p-10 text-center">
            <EmptyHeader>
              <EmptyMedia variant="accent">
                <CircleAlert className="size-7" />
              </EmptyMedia>
              <EmptyTitle className="text-2xl font-light tracking-tight text-white">
                Cloudflare R2 is unreachable
              </EmptyTitle>
              <EmptyDescription className="max-w-md text-sm text-zinc-400">
                {error || "The media library could not read the bucket."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button className="rounded-full" onClick={() => void loadAssets()}>
                <RefreshCw />Try again
              </Button>
            </EmptyContent>
          </Empty>
        )}

        {connection === "disconnected" && <ConnectGuide bucket={data?.bucket || "zerocraft-media"} />}

        {connection === "connected" && (
          <>
            <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-[.16em] text-muted-foreground">ZeroCraft Studio / Library</p>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">Media library</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {loading
                    ? "Loading your R2 assets…"
                    : `${visible.length} of ${assets.length} asset${assets.length === 1 ? "" : "s"} · ${folder === "all" ? "all folders" : folder === ROOT_FOLDER_VALUE ? "studio root" : `studio/${folder}/`}`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="h-8 gap-2 rounded-lg border-border px-3 text-xs">
                  <span className={`size-1.5 rounded-full ${data?.publicBaseUrlConfigured ? "bg-emerald-500" : "bg-amber-500"}`} />
                  {data?.publicBaseUrlConfigured ? "Public URLs ready" : "Public URL not set"}
                </Badge>
                <Button variant="outline" size="sm" className="border-border" onClick={() => void loadAssets()} disabled={loading}>
                  <RefreshCw className={loading ? "animate-spin" : ""} />Refresh
                </Button>
                <Button
                  size="sm"
                  className="shadow-sm"
                  disabled={uploads.some((item) => item.status === "uploading")}
                  onClick={openFilePicker}
                >
                  <Upload />Upload files
                </Button>
              </div>
            </header>

            <section aria-label="Library overview" className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: "Assets", value: String(data?.storage?.objectCount ?? assets.length), icon: FileImage, detail: "Across the library" },
                { label: "Folders", value: String(data?.storage?.folderCount ?? folders.length), icon: Folder, detail: "In studio/" },
                { label: "Image assets", value: String(assets.filter((asset) => asset.type === "Image" || asset.type === "SVG").length), icon: ImageIcon, detail: "Images and vectors" },
                { label: "Storage", value: `${formatBytes(usedBytes)} / ${formatBytes(capacityBytes)}`, icon: HardDrive, detail: `${storagePercent}% of configured capacity` },
              ].map(({ label, value, icon: Icon, detail }) => (
                <Card key={label} className="gap-1.5 border-border bg-card/70 p-3.5 shadow-none transition-colors hover:bg-card">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                    <Icon size={15} className="text-muted-foreground" />
                  </div>
                  <p className="truncate text-lg font-semibold tabular-nums text-card-foreground">{value}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{detail}</p>
                </Card>
              ))}
            </section>

            {error && (
              <div className="mt-4 max-w-xl space-y-2">
                <Alert variant="destructive" className="rounded-xl border-destructive/20 bg-destructive/5 text-destructive">
                  <CircleAlert />
                  <AlertTitle>Something needs attention</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}

            <div className={`mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-dashed px-4 py-3.5 transition-colors duration-200 ${
              isDragActive ? "justify-center border-primary bg-primary/10" : "border-border bg-card/60 hover:border-primary/40"
            }`}>
              {isDragActive ? (
                <p className="py-1 text-sm font-medium text-primary">
                  Release to upload to {uploadFolder === ROOT_FOLDER_VALUE ? "studio/" : `studio/${uploadFolder}/`}
                </p>
              ) : (
                <>
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <CloudUpload size={19} />
                  </span>
                  <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Drop files anywhere</span> or paste from the clipboard.
                    Uploading to <span className="font-medium text-foreground">{uploadFolder === ROOT_FOLDER_VALUE ? "studio/" : `studio/${uploadFolder}/`}</span>
                    <span className="ml-1 text-xs">· 250 MB max per file</span>
                  </p>
                  <Button variant="outline" size="sm" className="border-border" onClick={openFilePicker}>
                    <FolderOpen size={16} />Browse files
                  </Button>
                </>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><SlidersHorizontal size={14} />Type</span>
                {["All", "Image", "SVG", "Video", "Audio", "Docs"].map((item) => (
                  <Button
                    key={item}
                    variant={filter === item ? "secondary" : "ghost"}
                    size="sm"
                    className={filter === item ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"}
                    onClick={() => setFilter(item)}
                    aria-pressed={filter === item}
                  >
                    {item}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SelectField
                  value={uploadFolder}
                  onValueChange={(value) => value && setUploadFolder(value)}
                  options={[
                    { value: ROOT_FOLDER_VALUE, label: "Destination: studio root" },
                    { value: "general", label: "Destination: general" },
                    ...folders.filter((entry) => entry.name !== "general").map((entry) => ({ value: entry.name, label: `Destination: ${entry.name}` })),
                  ]}
                  aria-label="Upload and paste destination folder"
                  className={`h-8 data-[size=default]:h-8 w-48 border-border bg-background text-xs ${focusRing}`}
                />
                <SelectField
                  value={sort}
                  onValueChange={(value) => value && setSort(value as SortMode)}
                  options={[
                    { value: "recent", label: "Newest first" },
                    { value: "oldest", label: "Oldest first" },
                    { value: "size", label: "Largest first" },
                    { value: "name", label: "Name A–Z" },
                  ]}
                  aria-label="Sort assets"
                  className={`h-8 data-[size=default]:h-8 w-36 border-border bg-background text-xs ${focusRing}`}
                />
                <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
                  <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon-sm" aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => setView("grid")}>
                    <ImageIcon />
                  </Button>
                  <Button variant={view === "list" ? "secondary" : "ghost"} size="icon-sm" aria-label="List view" aria-pressed={view === "list"} onClick={() => setView("list")}>
                    <FileText />
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={visible.length > 0 && visibleSelectedCount === visible.length}
                  onCheckedChange={selectAllVisible}
                  aria-label="Select all visible assets"
                />
                <button
                  type="button"
                  onClick={selectAllVisible}
                  aria-pressed={visible.length > 0 && visibleSelectedCount === visible.length}
                  className="text-xs font-medium text-card-foreground transition-colors hover:text-primary"
                >
                  {visible.length > 0 && visibleSelectedCount === visible.length ? "Deselect all" : "Select all"}
                </button>
              </div>
              <span className="mr-auto text-xs text-muted-foreground">
                {selectedAssets.length ? `${selectedAssets.length} selected` : `${visible.length} items`}
                <span className="ml-2 hidden text-[11px] sm:inline">Ctrl/⌘ A · C · X · V</span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => copySelectedAssets("copy")} disabled={!selectedAssets.length}>
                <Copy />Copy
              </Button>
              <Button variant="ghost" size="sm" onClick={() => copySelectedAssets("cut")} disabled={!selectedAssets.length}>
                <Scissors />Move
              </Button>
              <Button variant="outline" size="sm" className="border-border" onClick={() => void pasteAssets()} disabled={!assetClipboard.assets.length}>
                <ClipboardPaste />Paste {assetClipboard.assets.length ? `(${assetClipboard.assets.length})` : ""}
              </Button>
            </div>

            <StudioLoadTransition
              loading={loading}
              label="Loading media assets…"
              loadingClassName="mt-5 min-h-44 rounded-xl border border-border bg-card"
            >
            {visible.length === 0 ? (
              <Empty className="mt-5 rounded-xl border border-dashed border-border bg-card/50 p-10">
                <EmptyHeader>
                  <EmptyMedia variant="accent">
                    <FileImage className="size-7" />
                  </EmptyMedia>
                  <EmptyTitle className="text-xl font-semibold tracking-tight text-foreground">
                    {assets.length ? "No matching assets" : "Your library is ready"}
                  </EmptyTitle>
                  <EmptyDescription className="max-w-md text-sm text-muted-foreground">
                    {query
                      ? `No assets match “${query}”. Try adjusting the search or the media filter.`
                      : assets.length
                        ? "Try another folder or file type filter."
                        : `Drop images, video, vectors, or documents here to upload into ${uploadFolder === ROOT_FOLDER_VALUE ? "studio/" : `studio/${uploadFolder}/`}.`}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    className="h-10 px-5"
                    onClick={openFilePicker}
                  >
                    <Upload />
                    Browse files
                  </Button>
                </EmptyContent>
              </Empty>
            ) : view === "grid" ? (
              <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3.5 pb-2">
                {visible.map((asset) => (
                  <AssetCard
                    key={asset.key}
                    asset={asset}
                    selected={selected?.key === asset.key}
                    selectedForAction={selectedAssetKeys.has(asset.key)}
                    onSelect={() => setSelected(asset)}
                    onToggleSelect={() => toggleAssetSelection(asset)}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-card/60">
                  <div className="grid min-w-[640px] grid-cols-[2rem_auto_minmax(0,2fr)_minmax(0,.8fr)_minmax(0,.7fr)_auto] gap-4 border-b border-border px-4 py-3 text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                  <span aria-label="Select assets" />
                  <span className="w-12">Type</span>
                  <span>File</span>
                  <span className="text-right">Size</span>
                  <span>Folder</span>
                  <span className="w-24 text-right">Alt text</span>
                </div>
                {visible.map((asset) => (
                  <div key={asset.key} className="grid min-w-[640px] grid-cols-[2rem_minmax(0,1fr)] items-stretch border-b border-border last:border-b-0">
                    <div className="grid place-items-center">
                      <Checkbox
                        checked={selectedAssetKeys.has(asset.key)}
                        onCheckedChange={() => toggleAssetSelection(asset)}
                        aria-label={`${selectedAssetKeys.has(asset.key) ? "Deselect" : "Select"} ${asset.fileName}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelected(asset)}
                      className={`grid w-full grid-cols-[auto_minmax(0,2fr)_minmax(0,.8fr)_minmax(0,.7fr)_auto] items-center gap-4 px-4 py-3 text-left transition-colors ${
                        selected?.key === asset.key ? "bg-accent/70" : "hover:bg-muted/70"
                      }`}
                      style={selected?.key === asset.key ? { boxShadow: `inset 2px 0 0 ${accent}` } : undefined}
                    >
                      <span className={`relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl ${previewClass(asset.type)}`}>
                        <AssetPreview asset={asset} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{asset.fileName}</span>
                        <span className="block truncate text-xs text-zinc-400">{asset.mimeType || asset.type}</span>
                      </span>
                      <span className="text-right text-sm tabular-nums text-zinc-300">{formatBytes(asset.sizeBytes)}</span>
                      <span className="truncate text-sm text-muted-foreground">{asset.folder || "studio root"}</span>
                      <span className="flex w-24 items-center justify-end gap-1.5 text-xs">
                        {asset.altText ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-300">
                            <CheckCircle2 size={13} />Ready
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}
            </StudioLoadTransition>
          </>
        )}
      </section>

      {uploads.length > 0 && (
        <div className="fixed bottom-4 right-4 z-30 w-[min(26rem,calc(100vw-2rem))]">
          <Card className="gap-3 border-border bg-card/95 p-3 shadow-xl backdrop-blur-xl">
                <CardHeader className="flex flex-row items-center justify-between gap-3 px-1 pb-1">
                  <div>
                    <CardTitle className="text-sm">Upload queue</CardTitle>
                    <p className="mt-1 text-[11px] text-muted-foreground">{uploads.filter((item) => item.status === "uploading").length} uploading</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Clear finished uploads"
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setUploads((current) => current.filter((item) => item.status === "uploading"))}
              >
                Clear finished
              </button>
            </CardHeader>
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {uploads.map((item) => (
                <Attachment key={item.id} size="sm" state={item.status} className="w-full max-w-none">
                  <AttachmentMedia>
                    {item.status === "done" ? <CheckCircle2 className="text-emerald-500" /> : item.status === "error" ? <CircleAlert /> : <Spinner />}
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{item.name}</AttachmentTitle>
                    <AttachmentDescription>
                      {item.error || `${item.folder === ROOT_FOLDER_VALUE ? "studio/" : `studio/${item.folder}/`} · ${item.status === "uploading" ? `Uploading ${item.progress}%` : item.status === "done" ? "Uploaded" : "Upload failed"}`}
                    </AttachmentDescription>
                    {item.status === "uploading" && (
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${item.progress}%` }} />
                      </div>
                    )}
                  </AttachmentContent>
                  {item.status !== "uploading" && (
                    <AttachmentActions>
                      <AttachmentAction
                        aria-label={`Dismiss ${item.name}`}
                        onClick={() => setUploads((current) => current.filter((entry) => entry.id !== item.id))}
                      >
                        <X />
                      </AttachmentAction>
                    </AttachmentActions>
                  )}
                </Attachment>
              ))}
            </div>
          </Card>
        </div>
      )}

      <aside aria-label="Selected asset details" className="relative z-10 flex min-h-0 w-full flex-col gap-4 rounded-xl border border-border bg-card/80 p-4 text-sm text-card-foreground shadow-none backdrop-blur-xl xl:col-span-2 2xl:sticky 2xl:top-4 2xl:col-span-1 2xl:col-start-3 2xl:row-start-1 2xl:max-h-[calc(100dvh-2rem)] 2xl:overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border px-0 pb-3">
          <CardTitle className="text-base">Asset details</CardTitle>
          {selected && (
            <Button variant="ghost" size="icon-sm" aria-label="Clear selected asset" onClick={() => setSelected(null)}>
              <X />
            </Button>
          )}
        </CardHeader>
        {connection !== "connected" ? (
          <EmptyContent className="flex flex-1 items-center justify-center">
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-8 text-center">
              <CloudUpload className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium text-card-foreground">Connect Cloudflare R2</p>
              <p className="max-w-[26ch] text-xs text-muted-foreground">
                Follow the setup guide to link the bucket, then every upload, folder, and asset lands here.
              </p>
            </div>
          </EmptyContent>
        ) : selected ? (
          <>
            <div className={`grid aspect-[4/3] w-full max-h-[320px] shrink-0 place-items-center overflow-hidden rounded-xl border border-border ${previewClass(selected.type)}`}>
              <AssetPreview key={selected.key} asset={selected} />
            </div>
            <div>
              {editingName ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Input
                      autoFocus
                      value={renameText}
                      onChange={(event) => setRenameText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void saveRename();
                        if (event.key === "Escape") setEditingName(false);
                      }}
                      aria-label="Asset file name"
                      className={`h-9 border-border bg-background text-sm ${focusRing}`}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Save file name"
                      className="size-9 shrink-0 border-border"
                      disabled={savingRename || !renameText.trim() || (renameText.trim() === selected.fileName && (renameFolder === ROOT_FOLDER_VALUE ? "" : renameFolder) === (selected.folder ?? ""))}
                      onClick={() => void saveRename()}
                    >
                      {savingRename ? <Spinner className="size-3.5" /> : <CheckCircle2 className="size-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Cancel rename"
                      className="size-9 shrink-0 border-border"
                      onClick={() => { setEditingName(false); setRenameText(selected.fileName); setRenameFolder(folderSelectValue(selected.folder)); }}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                  <SelectField
                    value={renameFolder}
                    onValueChange={(value) => setRenameFolder(value || ROOT_FOLDER_VALUE)}
                    options={[
                      { value: ROOT_FOLDER_VALUE, label: "Studio root · studio/" },
                      ...folders.map((entry) => ({ value: entry.name, label: `/ ${entry.name}` })),
                    ]}
                    aria-label="Asset folder"
                    className={`h-9 data-[size=default]:h-9 w-full border-border bg-background text-sm ${focusRing}`}
                  />
                  <p className="text-[11px] text-muted-foreground">Moving or renaming changes the public URL. Referenced assets stay locked.</p>
                </div>
              ) : (
                <h2 className="flex items-center gap-1.5 text-lg font-medium">
                  <span className="truncate">{selected.fileName}</span>
                  <button
                    type="button"
                    aria-label="Rename asset"
                    onClick={() => setEditingName(true)}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Pencil size={14} />
                  </button>
                </h2>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge style={{ backgroundColor: accent, color: accentForeground }}>{selected.type}</Badge>
                {selected.altText ? (
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    <CheckCircle2 size={12} />Alt text ready
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    Alt text missing
                  </Badge>
                )}
              </div>
            </div>
            <div>
              {[
                ["Folder", selected.folder || "studio root"],
                ["Size", formatBytes(selected.sizeBytes)],
                ["Modified", selected.lastModified ? new Date(selected.lastModified).toLocaleString() : "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-4 border-b border-border py-2 text-sm last:border-b-0">
                  <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
                  <span className="min-w-0 break-all font-medium text-card-foreground">{value}</span>
                </div>
              ))}
              <div className="flex gap-4 border-b border-border py-2 text-sm">
                <span className="w-20 shrink-0 text-muted-foreground">Path</span>
                <span className="min-w-0 break-all font-mono text-xs font-medium text-card-foreground">{selected.key}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="alt-text" className="text-[13px] font-medium text-card-foreground">Alt text</label>
                <span className="text-[11px] tabular-nums text-muted-foreground">{altText.length}/500</span>
              </div>
              <Textarea
                id="alt-text"
                value={altText}
                maxLength={500}
                onChange={(event) => setAltText(event.target.value)}
                placeholder="Describe this asset for accessibility and SEO…"
                className={`mt-1.5 min-h-20 text-sm placeholder:text-muted-foreground ${focusRing}`}
              />
              <Button
                className="mt-2 w-full"
                disabled={savingMetadata || altText.trim() === selected.altText}
                onClick={() => void saveMetadata()}
              >
                {savingMetadata ? <Spinner className="size-4" /> : <CheckCircle2 className="size-4" />}
                {savingMetadata ? "Saving…" : "Save alt text"}
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-background/60 p-3.5">
              <p className="text-[13px] font-medium text-card-foreground">Usage references</p>
              {references === null ? (
                <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Spinner className="size-3.5" />Checking pages, branding, and portfolio…
                </p>
              ) : references.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Not referenced anywhere in content, branding, or works yet — safe to delete.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {references.map((reference) => (
                    <li key={reference.id} className="rounded-lg border border-border bg-card px-3 py-2 text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-card-foreground">
                        <CircleAlert size={12} className="shrink-0 text-amber-300" />
                        {reference.label}
                        {reference.href && (
                          <Link href={reference.href} className="ml-auto inline-flex items-center gap-1 text-muted-foreground hover:text-foreground" target="_blank">
                            open<ArrowUpRight size={12} />
                          </Link>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-muted-foreground">{reference.detail}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-auto flex flex-col gap-2">
              {selected.publicUrl && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full border-white/15"
                    onClick={async () => {
                      try { await navigator.clipboard.writeText(selected.publicUrl ?? ""); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { setError("Clipboard access was blocked."); }
                    }}
                  >
                    {copied ? <CheckCircle2 /> : <Copy />}{copied ? "Copied" : "Copy URL"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full border-white/15"
                    render={<a href={selected.publicUrl} target="_blank" rel="noopener noreferrer" />}
                  >
                    <ExternalLink />Open
                  </Button>
                </div>
              )}
              {!selected.publicUrl && (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-200">
                  Set CLOUDFLARE_R2_PUBLIC_BASE_URL to expose preview images and public links for this asset.
                </p>
              )}
              <Button
                variant="outline"
                className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => void startDelete(selected)}
              >
                <Trash2 />Delete asset
              </Button>
            </div>
          </>
        ) : (
          <Empty className="flex-1 border-none bg-transparent p-6">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="size-11">
                <FolderOpen className="size-5 text-muted-foreground" />
              </EmptyMedia>
              <EmptyTitle className="text-sm font-medium text-card-foreground">Select an asset</EmptyTitle>
              <EmptyDescription className="text-xs text-muted-foreground">
                Pick any file to edit alt text, inspect where it is used, copy its public URL, or delete it safely.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </aside>

      <Dialog open={folderDialog !== null} onOpenChange={(open) => !open && setFolderDialog(null)}>
        <DialogContent className="border-border bg-popover text-popover-foreground">
          <DialogHeader>
            <DialogTitle>{folderDialog?.mode === "rename" ? "Rename folder" : "New folder"}</DialogTitle>
            <DialogDescription className="text-muted-foreground">Folders live under zerocraft-media/studio/.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            placeholder="Folder name"
            className="border-input bg-background"
            onKeyDown={(event) => event.key === "Enter" && void saveFolder()}
          />
          <DialogFooter className="border-border bg-muted/50">
            <Button variant="outline" onClick={() => setFolderDialog(null)}>Cancel</Button>
            <Button disabled={!folderName.trim() || savingFolder} onClick={() => void saveFolder()}>
              {savingFolder ? <Spinner className="size-4" /> : null}
              {folderDialog?.mode === "rename" ? "Rename folder" : "Create folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteState.open} onOpenChange={(open) => { if (!open || (deleteState.open && deleteState.phase === "deleting")) setDeleteState({ open: false }); }}>
        <DialogContent className="border-border bg-popover text-popover-foreground">
          {deleteState.open && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {deleteState.phase === "blocked" ? <CircleAlert className="text-amber-300" /> : <Trash2 />}
                  {deleteState.phase === "blocked" ? "This asset is still in use" : "Delete asset"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {deleteState.asset.fileName}
                </DialogDescription>
              </DialogHeader>

              {deleteState.phase === "checking" && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="size-4" />Checking pages, branding, and portfolio references…
                </p>
              )}

              {deleteState.phase !== "checking" && (
                <div className="rounded-xl border border-border bg-card/60 p-3.5">
                  {deleteState.phase === "blocked" ? (
                    <Alert variant="destructive" className="border-amber-300/25 bg-amber-300/[.08] text-amber-100">
                      <CircleAlert />
                      <AlertTitle className="text-sm">Delete blocked</AlertTitle>
                      <AlertDescription className="text-xs text-amber-100/80">
                        This asset is still referenced, so the bucket keeps it. Remove the usages first:
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      This removes the object from Cloudflare R2 (bucket {data?.bucket}) and cannot be undone. It is not
                      referenced by any content page, branding slot, or portfolio work.
                    </p>
                  )}
                  {deleteState.references.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {deleteState.references.map((reference) => (
                        <li key={reference.id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs">
                          <CircleAlert size={12} className="shrink-0 text-amber-300" />
                          <span className="min-w-0">
                            <span className="block font-medium text-card-foreground">{reference.label}</span>
                            <span className="block truncate text-muted-foreground">{reference.detail}</span>
                          </span>
                          <Link href={reference.href} target="_blank" className="ml-auto inline-flex shrink-0 items-center gap-1 text-muted-foreground hover:text-foreground">
                            open<ArrowUpRight size={12} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  {deleteState.error && <p className="mt-2 text-xs text-red-300">{deleteState.error}</p>}
                </div>
              )}

              <DialogFooter className="border-border bg-muted/50">
                <Button variant="outline" onClick={() => setDeleteState({ open: false })}>Close</Button>
                <Button
                  variant="destructive"
                  disabled={deleteState.phase !== "confirm"}
                  onClick={() => {
                    if (deleteState.phase !== "confirm") return;
                    const asset = deleteState.asset;
                    setDeleteState({ open: true, asset, phase: "deleting", references: deleteState.references, error: "" });
                    void (async () => {
                      try {
                        const response = await fetch(`/api/studio/media?key=${encodeURIComponent(asset.key)}`, { method: "DELETE" });
                        const payload = await response.json() as { error?: string; references?: MediaReference[] };
                        if (!response.ok) throw new Error(payload.error ?? "Delete failed.");
                        setDeleteState({ open: false });
                        studioToast.success("Asset deleted", asset.fileName);
                        setSelected((current) => (current?.key === asset.key ? null : current));
                        await loadAssets();
                      } catch (caught) {
                        setError(caught instanceof Error ? caught.message : "Delete failed.");
                        setDeleteState({ open: false });
                      }
                    })();
                  }}
                >
                  {deleteState.phase === "deleting" ? <Spinner className="size-4" /> : <Trash2 />}
                  {deleteState.phase === "deleting" ? "Deleting…" : "Delete from R2"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssetPreview({ asset }: { asset: Asset }) {
  const [failed, setFailed] = useState(false);
  const canShow = (asset.type === "Image" || asset.type === "SVG") && asset.publicUrl && !failed;
  if (!canShow) {
    return asset.type === "Video"
      ? <Film size={30} className="text-white/80" />
      : asset.type === "Audio"
        ? <Music size={30} className="text-white/80" />
        : asset.type === "Doc"
          ? <FileText size={30} className="text-white/80" />
          : <FileImage size={30} className="text-white/80" />;
  }
  return (
    // R2 objects are fully dynamic public URLs, so the stock next/image loader can't optimize them.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset.publicUrl ?? ""}
      alt={asset.altText || asset.fileName}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`block h-full w-full ${asset.type === "SVG" ? "bg-[#ececee] object-contain p-5" : "object-cover"}`}
    />
  );
}

function AssetCard({
  asset,
  selected,
  selectedForAction,
  onSelect,
  onToggleSelect,
}: {
  asset: Asset;
  selected: boolean;
  selectedForAction: boolean;
  onSelect: () => void;
  onToggleSelect: () => void;
}) {
  return (
    <Card className={`group relative gap-0 border-border bg-card p-2 shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg ${
      selected ? "border-primary/70 ring-1 ring-primary/30" : ""
    }`}>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className={`relative grid aspect-[4/3] place-items-center overflow-hidden rounded-lg ${previewClass(asset.type)}`}>
          <AssetPreview asset={asset} />
          <Badge className="absolute left-2 top-2 border border-black/10 bg-background/90 text-[10px] text-foreground shadow-sm">{asset.type}</Badge>
        </div>
        <p className="mt-2 truncate px-1 text-sm font-medium text-card-foreground" title={asset.fileName}>{asset.fileName}</p>
        <div className="mt-1 flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
          {asset.type === "Video" ? <Film size={12} className="shrink-0" /> : asset.type === "Audio" ? <Music size={12} className="shrink-0" /> : asset.type === "Doc" ? <FileText size={12} className="shrink-0" /> : <FileImage size={12} className="shrink-0" />}
          <span className="shrink-0 tabular-nums">{formatBytes(asset.sizeBytes)}</span>
          <span className="ml-auto min-w-0 truncate">{asset.folder || "studio root"}</span>
        </div>
      </button>
      <Checkbox
        checked={selectedForAction}
        onCheckedChange={onToggleSelect}
        aria-label={`${selectedForAction ? "Deselect" : "Select"} ${asset.fileName}`}
        className="absolute left-4 top-4 rounded-md border-white/80 bg-background/90 shadow-sm data-checked:border-primary data-checked:bg-primary"
      />
    </Card>
  );
}

function ConnectGuide({ bucket }: { bucket: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const envBlock = [
    "CLOUDFLARE_R2_ACCOUNT_ID=your-account-id",
    "CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key",
    "CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret",
    `CLOUDFLARE_R2_BUCKET=${bucket}`,
    "CLOUDFLARE_R2_PUBLIC_BASE_URL=https://media.yourdomain.com",
  ].join("\n");
  return (
    <Card className="mt-4 gap-5 border-border bg-card/60 p-5 shadow-none sm:p-7">
      <header className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <CloudUpload className="size-5" />
        </span>
        <div>
          <Badge variant="outline" className="mb-2 border-amber-500/30 text-amber-700 dark:text-amber-200">Setup required</Badge>
          <h2 className="text-xl font-semibold tracking-tight text-card-foreground">Connect Cloudflare R2</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Configure the server credentials to load assets and enable uploads. Your library, folders, and metadata remain in the bucket.
          </p>
        </div>
      </header>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.9fr)]">
        <ol className="grid content-start gap-2 sm:grid-cols-2 xl:grid-cols-1">
          {setupSteps.map((step, index) => (
            <li key={step.title} className="flex items-start gap-3 rounded-xl border border-border bg-background/70 px-3.5 py-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-card-foreground">{step.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground">Environment template · apps/studio/.env</p>
            <Button
              variant="outline"
              size="xs"
              className="border-border"
              onClick={async () => {
                setCopyError("");
                try {
                  await navigator.clipboard.writeText(envBlock);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                } catch {
                  setCopyError("Clipboard access was blocked. Select and copy the template manually.");
                }
              }}
            >
              {copied ? <CheckCircle2 /> : <Copy />}{copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-muted/50 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">{envBlock}</pre>
          {copyError && <p role="status" className="mt-2 text-xs text-destructive">{copyError}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button render={<Link href="/studio/settings/integrations" />}>
          <ExternalLink />Open integrations
        </Button>
        <Button variant="outline" className="border-border" render={<Link href="https://developers.cloudflare.com/r2/get-started/" target="_blank" rel="noreferrer" />}>
          <ArrowUpRight />R2 docs
        </Button>
      </div>
    </Card>
  );
}
