"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { Button } from "@zerocraft/ui/button";
import { Input } from "@zerocraft/ui/input";
import { Label } from "@zerocraft/ui/label";
import { Checkbox } from "@zerocraft/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@zerocraft/ui/dialog";
import {
  normalizeImageUrl,
  normalizeLinkUrl,
  parseVideoUrl,
  type VideoAttrs,
} from "./extensions";

/*
 * NOTE: these dialogs are portaled, but React events still bubble to the React parent.
 * If the editor sits inside a <form>, a nested <form>/submit would submit it. So we use
 * plain buttons + Enter key handlers instead of <form>.
 */
const onEnter = (fn: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === "Enter") {
    e.preventDefault();
    e.stopPropagation();
    fn();
  }
};

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/* ───────────────────────── link ───────────────────────── */
export function LinkDialog({
  initialHref,
  initialNewTab,
  isEditing,
  onSubmit,
  onRemove,
  onClose,
}: {
  initialHref: string;
  initialNewTab: boolean;
  isEditing: boolean;
  onSubmit: (value: { href: string; newTab: boolean }) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [href, setHref] = React.useState(initialHref);
  const [newTab, setNewTab] = React.useState(initialNewTab);
  const [error, setError] = React.useState<string | null>(null);

  const submit = () => {
    const url = normalizeLinkUrl(href);
    if (!url) return setError("Enter a valid URL, email or phone link.");
    onSubmit({ href: url, newTab });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit link" : "Insert link"}</DialogTitle>
          <DialogDescription>Paste a web address, email or phone link.</DialogDescription>
        </DialogHeader>
        <Field id="rte-link-url" label="Link" error={error}>
          <Input
            id="rte-link-url"
            autoFocus
            value={href}
            placeholder="https://example.com"
            aria-invalid={!!error || undefined}
            onChange={(e) => {
              setHref(e.target.value);
              setError(null);
            }}
            onKeyDown={onEnter(submit)}
          />
        </Field>
        <div className="flex items-center gap-2">
          <Checkbox
            id="rte-link-tab"
            checked={newTab}
            onCheckedChange={(c) => setNewTab(c === true)}
          />
          <Label htmlFor="rte-link-tab" className="font-normal">
            Open in a new tab
          </Label>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {isEditing ? (
            <Button type="button" variant="outline" className="text-destructive" onClick={onRemove}>
              Remove link
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={submit}>
              {isEditing ? "Update" : "Insert"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── image ───────────────────────── */
export function ImageDialog({
  onSubmit,
  onUpload,
  onClose,
}: {
  onSubmit: (value: { src: string; alt: string }) => void;
  onUpload?: (file: File) => Promise<string>;
  onClose: () => void;
}) {
  const [src, setSrc] = React.useState("");
  const [alt, setAlt] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const submit = () => {
    const url = normalizeImageUrl(src);
    if (!url) return setError("Enter a valid image URL (https://…).");
    onSubmit({ src: url, alt: alt.trim() });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !onUpload) return;
    if (!file.type.startsWith("image/")) return setError("Choose an image file.");
    setBusy(true);
    setError(null);
    try {
      setSrc(await onUpload(file));
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Insert image</DialogTitle>
          <DialogDescription>
            {onUpload ? "Upload an image or paste its URL." : "Paste the image URL."}
          </DialogDescription>
        </DialogHeader>
        {onUpload && (
          <>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="w-full"
            >
              <Upload className="mr-2 size-4" />
              {busy ? "Uploading…" : "Upload image"}
            </Button>
          </>
        )}
        <Field id="rte-image-url" label="Image URL" error={error}>
          <Input
            id="rte-image-url"
            autoFocus={!onUpload}
            value={src}
            placeholder="https://…/photo.jpg"
            aria-invalid={!!error || undefined}
            onChange={(e) => {
              setSrc(e.target.value);
              setError(null);
            }}
            onKeyDown={onEnter(submit)}
          />
        </Field>
        <Field id="rte-image-alt" label="Alt text">
          <Input
            id="rte-image-alt"
            value={alt}
            placeholder="Describe the image"
            onChange={(e) => setAlt(e.target.value)}
            onKeyDown={onEnter(submit)}
          />
        </Field>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={busy}>
            Insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── video ───────────────────────── */
export function VideoDialog({
  onSubmit,
  onClose,
}: {
  onSubmit: (value: VideoAttrs) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const submit = () => {
    const parsed = parseVideoUrl(url);
    if (!parsed) return setError("Use a YouTube or Vimeo link, or a direct .mp4 / .webm file.");
    onSubmit(parsed);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Insert video</DialogTitle>
          <DialogDescription>YouTube, Vimeo or a direct video file link.</DialogDescription>
        </DialogHeader>
        <Field id="rte-video-url" label="Video URL" error={error}>
          <Input
            id="rte-video-url"
            autoFocus
            value={url}
            placeholder="https://www.youtube.com/watch?v=…"
            aria-invalid={!!error || undefined}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            onKeyDown={onEnter(submit)}
          />
        </Field>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submit}>
            Insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
