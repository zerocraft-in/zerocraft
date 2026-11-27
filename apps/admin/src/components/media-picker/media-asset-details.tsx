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
import { Button } from "@zerocraft/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@zerocraft/ui/card";
import { Input } from "@zerocraft/ui/input";
import { Label } from "@zerocraft/ui/label";
import { deleteMediaFile, renameMediaFile } from "@/app/(dashboard)/content/files/actions";
import {
  Copy,
  ExternalLink,
  Trash2,
  Edit,
  AlertCircle,
  Clock,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AssetDetails {
  id: string;
  key: string;
  name: string;
  url: string;
  contentType: string | null;
  size: number;
  organizationId: string;
  referenceCount?: number;
  references?: Array<{
    entityType: string;
    entityId: string;
    fieldName: string;
  }>;
}

interface MediaAssetDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetDetails;
  onRename?: (assetId: string, newName: string) => void;
  onDelete?: (assetId: string) => void;
}

export function MediaAssetDetails({
  open,
  onOpenChange,
  asset,
  onRename,
  onDelete,
}: MediaAssetDetailsProps) {
  const isImage = Boolean(asset.contentType?.startsWith("image/"));
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [renameName, setRenameName] = React.useState(asset.name);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleRenameSubmit = async () => {
    if (!renameName.trim() || renameName === asset.name) {
      setRenameOpen(false);
      return;
    }
    setIsRenaming(true);
    try {
      const result = await renameMediaFile({
        mediaId: asset.id,
        name: renameName.trim(),
      });
      if (result.ok) {
        onRename?.(asset.id, renameName.trim());
        toast.add({ title: "File renamed.", type: "success" });
      } else {
        toast.add({ title: result.error, type: "error" });
      }
    } catch {
      toast.add({ title: "Failed to rename file.", type: "error" });
    } finally {
      setIsRenaming(false);
      setRenameOpen(false);
    }
  };

  const handleDeleteSubmit = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteMediaFile({ mediaId: asset.id });
      if (result.ok) {
        onDelete?.(asset.id);
        toast.add({ title: "File deleted.", type: "success" });
      } else {
        toast.add({ title: result.error, type: "error" });
      }
    } catch {
      toast.add({ title: "Failed to delete file.", type: "error" });
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(asset.url).then(() => {
      toast.add({ title: "URL copied to clipboard.", type: "success" });
    });
  };

  const contentTypeLabel = asset.contentType ?? "application/octet-stream";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] sm:max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Asset details</DialogTitle>
          <DialogDescription>
            {asset.name}
          </DialogDescription>
        </DialogHeader>
        <Separator className="my-3" />

        <div className="flex flex-col gap-4 overflow-y-auto flex-1">
          {/* Preview */}
          <div className="flex items-center justify-center">
            <div
              className={cn(
                "relative flex items-center justify-center rounded-lg border border-border bg-muted",
                isImage ? "aspect-video overflow-hidden" : "w-48 h-32",
              )}
            >
              {isImage ? (
                <Image
                  fill
                  src={asset.url}
                  alt={asset.name}
                  className="object-contain"
                  loader={() => asset.url}
                  loading="lazy"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <AlertCircle className="size-12" />
                  <span className="text-sm">{contentTypeLabel.split("/")[0]}</span>
                </div>
              )}
            </div>
          </div>

          {/* Metadata card */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">File name</span>
                <span className="font-medium truncate max-w-[200px]" title={asset.name}>
                  {asset.name}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Content type</span>
                <Badge variant="outline">{contentTypeLabel}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">File size</span>
                <span className="font-mono">{formatBytes(asset.size)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Folder</span>
                <span className="font-mono truncate">
                  {asset.key.split("/").slice(0, -1).join("/")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Object key</span>
                <span className="font-mono text-xs truncate max-w-[200px]" title={asset.key}>
                  {asset.key}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">CDN URL</span>
                <div className="flex items-center gap-2">
                  <Input
                    value={asset.url}
                    readOnly
                    className="text-xs font-mono truncate max-w-[240px]"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={copyUrl}
                    aria-label="Copy URL"
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reference count</span>
                <Badge variant={asset.referenceCount! > 0 ? "destructive" : "secondary"}>
                  {asset.referenceCount ?? 0}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* References */}
          {asset.references && asset.references.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Used in</CardTitle>
                <CardDescription>
                  Deleting this asset will break these references.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {asset.references.map((ref, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate">
                      {ref.entityType}.{ref.fieldName}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground truncate">
                      {ref.entityId}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between border-t pt-4">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setRenameName(asset.name); setRenameOpen(true); }}>
                  <Edit className="size-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
                  <Trash2 className="size-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                onClick={() => window.open(asset.url, "_blank")}
                aria-label="Open asset"
              >
                <ExternalLink className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={copyUrl}
                aria-label="Copy URL"
              >
                <Copy className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
      <DialogClose />

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename asset</DialogTitle>
            <DialogDescription>Enter a new name for {asset.name}.</DialogDescription>
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
              onClick={handleRenameSubmit}
              disabled={isRenaming || !renameName.trim()}
              className="ml-auto"
            >
              {isRenaming ? <Clock className="size-4 animate-spin" /> : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
        <DialogClose />
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete asset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-mono text-sm">{asset.name}</span>?
              {asset.referenceCount! > 0 && (
                <>
                  <br />
                  This asset is referenced in {asset.referenceCount} place(s) and deletion may break those references.
                </>
              )}
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <Separator />
          <DialogFooter>
            <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              onClick={handleDeleteSubmit}
              disabled={isDeleting}
              className="ml-auto text-destructive focus:text-destructive"
            >
              {isDeleting ? <Clock className="size-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
        <DialogClose />
      </Dialog>
    </Dialog>
  );
}
