"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bold,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Folder,
  GripVertical,
  ImagePlus,
  Italic,
  Layers3,
  Link2,
  Plus,
  Quote,
  Redo2,
  Save,
  Search,
  Trash2,
  Undo2,
} from "lucide-react";
import { Badge } from "@zerocraft/ui/components/badge";
import { Button } from "@zerocraft/ui/components/button";
import { StudioLoadTransition } from "@/components/studio-loading";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@zerocraft/ui/components/empty";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@zerocraft/ui/components/dropdown-menu";
import { Input } from "@zerocraft/ui/components/input";
import { Textarea } from "@zerocraft/ui/components/textarea";
import ContentBody, { safeImageUrl } from "@/components/content/ContentBody";
import { studio } from "@/lib/studio-config";
import { studioToast } from "@/lib/studio-toast";

type Status = "draft" | "published" | "archived";
type ContentType =
  | "page"
  | "blog"
  | "testimonial"
  | "case_study"
  | "announcement";
type Metadata = Record<string, unknown>;
type Page = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  content_type: ContentType;
  content_metadata: Metadata;
  status: Status;
  seo_title: string;
  seo_description: string;
  featured_image_url: string;
  workflow_status: string;
  scheduled_at?: string | null;
  updated_at: string;
};
type Draft = Omit<Page, "id" | "updated_at">;
type Asset = {
  key: string;
  fileName: string;
  publicUrl: string | null;
  altText: string;
};
type Block = {
  id: string;
  kind: string;
  title: string;
  body: string;
  done?: boolean;
};
type FolderInfo = {
  type: ContentType;
  title: string;
  description: string;
  tone: string;
};
type Version = {
  version: number;
  created_at: string;
  snapshot: Record<string, unknown>;
};

const blank: Draft = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  content_type: "page",
  content_metadata: {},
  status: "draft",
  seo_title: "",
  seo_description: "",
  featured_image_url: "",
  workflow_status: "draft",
  scheduled_at: null,
};
const folders: FolderInfo[] = [
  {
    type: "page",
    title: "Pages",
    description: "Website pages and landing screens",
    tone: "from-sky-500/20 to-indigo-500/5",
  },
  {
    type: "blog",
    title: "Blogs",
    description: "Articles, journals and insights",
    tone: "from-orange-500/20 to-amber-500/5",
  },
  {
    type: "testimonial",
    title: "Testimonials",
    description: "Client voices and social proof",
    tone: "from-pink-500/20 to-rose-500/5",
  },
  {
    type: "case_study",
    title: "Case studies",
    description: "Work, outcomes and stories",
    tone: "from-emerald-500/20 to-teal-500/5",
  },
  {
    type: "announcement",
    title: "Announcements",
    description: "Launches, updates and releases",
    tone: "from-violet-500/20 to-purple-500/5",
  },
];
const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const statusLabel = (value: Status) => value[0].toUpperCase() + value.slice(1);
const inferredType = (page: Page): ContentType =>
  page.content_type !== "page"
    ? page.content_type
    : page.slug.includes("testimonial")
      ? "testimonial"
      : page.slug.includes("case") || page.slug.includes("northstar")
        ? "case_study"
        : page.slug.includes("announcement")
          ? "announcement"
          : page.slug.includes("journal") ||
              page.slug.includes("content-system")
            ? "blog"
            : "page";
const collectionFor: Record<ContentType, string> = {
  page: "pages",
  blog: "blogs",
  testimonial: "testimonials",
  case_study: "case-studies",
  announcement: "announcements",
};
const toLocalDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};
const toDraft = (page?: Page | null): Draft =>
  page
    ? {
        title: page.title,
        slug: page.slug,
        excerpt: page.excerpt ?? "",
        content:
          inferredType(page) === "testimonial"
            ? (page.content ?? "").replace(/\\n/g, "\n")
            : (page.content ?? ""),
        content_type: inferredType(page),
        content_metadata: page.content_metadata ?? {},
        status: page.status,
        seo_title: page.seo_title ?? "",
        seo_description: page.seo_description ?? "",
        featured_image_url: page.featured_image_url ?? "",
        workflow_status: page.workflow_status ?? "draft",
        scheduled_at: page.scheduled_at ?? null,
      }
    : blank;
const text = (value: unknown) => (typeof value === "string" ? value : "");
const blockList = (metadata: Metadata): Block[] =>
  Array.isArray(metadata.blocks) ? (metadata.blocks as Block[]) : [];

function Field({
  label,
  value,
  placeholder,
  onChange,
  area = false,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  area?: boolean;
}) {
  return (
    <label className="block text-xs text-zinc-400">
      {label}
      {area ? (
        <Textarea
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          className="mt-1 border-white/10 bg-black/20"
        />
      ) : (
        <Input
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1 border-white/10 bg-black/20"
        />
      )}
    </label>
  );
}

function ArticleEditor({
  draft,
  update,
  titleRef,
  excerptRef,
  contentRef,
  openMedia,
  format,
  undo,
  redo,
  save,
}: {
  draft: Draft;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  titleRef: React.RefObject<HTMLDivElement | null>;
  excerptRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLTextAreaElement | null>;
  openMedia: (target: "body" | "cover") => void;
  format: (command: string, value?: string) => void;
  undo: () => void;
  redo: () => void;
  save: () => void;
}) {
  const coverUrl = safeImageUrl(draft.featured_image_url);
  const wordCount = draft.content.trim()
    ? draft.content.trim().split(/\s+/).length
    : 0;
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 220));
  return (
    <>
      <div className="relative mt-5 flex h-48 items-start justify-between overflow-hidden rounded-2xl border border-white/[.08] bg-[linear-gradient(145deg,#29211f,#191719_58%,#121216)] p-4">
        {coverUrl && (
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-55"
          />
        )}
        <div className="relative self-end">
          <p className="text-[10px] font-medium uppercase tracking-[.16em] text-white/60">
            Featured image
          </p>
          <p className="mt-1 text-xs text-white/80">
            {coverUrl
              ? "Cover image selected"
              : "Add a visual cover to your story"}
          </p>
        </div>
        <Button
          variant="outline"
          className="relative rounded-lg border-white/25 bg-black/20 text-xs backdrop-blur-sm"
          onClick={() => openMedia("cover")}
        >
          <ImagePlus size={15} />
          {draft.featured_image_url ? "Change cover" : "Choose cover"}
        </Button>
      </div>
      <div
        ref={titleRef}
        role="textbox"
        aria-label="Title"
        aria-multiline="false"
        data-placeholder="Give your story a clear title…"
        contentEditable
        suppressContentEditableWarning
        onInput={(event) => update("title", event.currentTarget.innerText)}
        className="mt-8 min-h-[1.2em] text-5xl font-extralight outline-none empty:before:pointer-events-none empty:before:text-zinc-700 empty:before:content-[attr(data-placeholder)] focus-visible:ring-2 focus-visible:ring-orange-300"
      />
      <Badge className="mt-3">{statusLabel(draft.status)}</Badge>
      <div
        ref={excerptRef}
        role="textbox"
        aria-label="Summary"
        aria-multiline="false"
        data-placeholder="Add a short summary to help readers and search engines…"
        contentEditable
        suppressContentEditableWarning
        onInput={(event) => update("excerpt", event.currentTarget.innerText)}
        className="mt-6 min-h-8 text-lg text-zinc-400 outline-none empty:before:pointer-events-none empty:before:text-zinc-700 empty:before:content-[attr(data-placeholder)] focus-visible:ring-2 focus-visible:ring-orange-300"
      />
      <div className="mt-7 flex flex-wrap items-center justify-between gap-2 border-y border-white/[.08] py-3 text-[11px] text-zinc-500">
        <span>
          Article body <span className="text-zinc-700">/</span> Markdown
        </span>
        <span>
          {wordCount} words <span className="px-1 text-zinc-700">·</span>
          {readingMinutes} min read
        </span>
      </div>
      <label className="mt-4 block text-xs text-zinc-400">
        Write your article
        <Textarea
          ref={contentRef}
          aria-label="Article content"
          value={draft.content}
          onChange={(event) => update("content", event.target.value)}
          rows={22}
          placeholder="Start writing… Markdown is supported."
          className="prose prose-invert mt-2 min-h-[420px] max-w-none rounded-xl border-white/10 bg-black/20 px-5 py-4 text-base leading-8 placeholder:text-zinc-700 focus-visible:border-orange-300/40"
        />
      </label>
      <div className="sticky bottom-4 mx-auto mt-8 flex max-w-full justify-center gap-1 overflow-x-auto rounded-xl border border-white/10 bg-[#1e1e21]/95 p-2 shadow-xl backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Button
          aria-label="Undo"
          title="Undo"
          size="icon-sm"
          variant="ghost"
          onClick={undo}
        >
          <Undo2 />
        </Button>
        <Button
          aria-label="Redo"
          title="Redo"
          size="icon-sm"
          variant="ghost"
          onClick={redo}
        >
          <Redo2 />
        </Button>
        <Button
          aria-label="Bold"
          title="Bold"
          size="icon-sm"
          variant="ghost"
          onClick={() => format("bold")}
        >
          <Bold />
        </Button>
        <Button
          aria-label="Italic"
          title="Italic"
          size="icon-sm"
          variant="ghost"
          onClick={() => format("italic")}
        >
          <Italic />
        </Button>
        <Button
          aria-label="Add link"
          title="Add link"
          size="icon-sm"
          variant="ghost"
          onClick={() => {
            const url = window.prompt("Link URL");
            if (url) format("createLink", url);
          }}
        >
          <Link2 />
        </Button>
        <Button
          aria-label="Insert body image"
          title="Insert body image"
          size="icon-sm"
          variant="ghost"
          onClick={() => openMedia("body")}
        >
          <ImagePlus />
        </Button>
        <Button
          aria-label="Quote"
          title="Quote"
          size="icon-sm"
          variant="ghost"
          onClick={() => format("formatBlock", "blockquote")}
        >
          <Quote />
        </Button>
        <Button
          aria-label="Save draft"
          title="Save draft"
          size="icon-sm"
          variant="ghost"
          onClick={save}
        >
          <Save />
        </Button>
      </div>
    </>
  );
}

function TestimonialEditor({
  draft,
  update,
}: {
  draft: Draft;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}) {
  const meta = draft.content_metadata;
  const setMeta = (key: string, value: unknown) =>
    update("content_metadata", { ...meta, [key]: value });
  const rawRating = meta.rating ?? 5;
  const ratingText = String(rawRating);
  const rating = Number(rawRating);
  const validRating = Number.isInteger(rating) && rating >= 1 && rating <= 5;
  return (
    <div className="mt-8 rounded-[32px] border border-pink-300/20 bg-gradient-to-br from-pink-500/10 to-white/[.03] p-6">
      <div className="flex items-center justify-between">
        <Badge className="bg-pink-400/20 text-pink-100">Client voice</Badge>
        <span
          aria-label={
            validRating ? `${rating} out of 5 stars` : "No valid rating"
          }
          className="text-2xl tracking-widest text-pink-200"
        >
          {"★".repeat(validRating ? rating : 0)}
          {"☆".repeat(5 - (validRating ? rating : 0))}
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field
          label="Title"
          value={draft.title}
          placeholder="A client's experience"
          onChange={(value) => update("title", value)}
        />
        <Field
          label="Summary"
          value={draft.excerpt}
          placeholder="A short testimonial summary"
          onChange={(value) => update("excerpt", value)}
        />
      </div>
      <label className="mt-6 block text-xs text-zinc-400">
        Quote
        <Textarea
          value={draft.content}
          onChange={(event) => update("content", event.target.value)}
          placeholder="Write the testimonial quote…"
          rows={5}
          className="mt-1 border-white/10 bg-black/20 text-2xl font-light leading-relaxed"
        />
      </label>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Field
          label="Person"
          value={text(meta.person)}
          placeholder="Maya Chen"
          onChange={(value) => setMeta("person", value)}
        />
        <Field
          label="Role / company"
          value={text(meta.role)}
          placeholder="Founder, Northstar"
          onChange={(value) => setMeta("role", value)}
        />
        <label className="block text-xs text-zinc-400">
          Rating
          <Input
            type="number"
            min={1}
            max={5}
            step={1}
            value={ratingText}
            onChange={(event) =>
              setMeta(
                "rating",
                event.target.value === "" ? "" : Number(event.target.value),
              )
            }
            aria-invalid={!validRating}
            aria-describedby="testimonial-rating-error"
            className="mt-1 border-white/10 bg-black/20"
          />
          <span
            id="testimonial-rating-error"
            role={!validRating ? "alert" : undefined}
            className={`mt-1 block text-xs ${validRating ? "text-zinc-500" : "text-red-300"}`}
          >
            {validRating
              ? "Choose a whole number from 1 to 5."
              : "Rating must be a whole number from 1 to 5."}
          </span>
        </label>
      </div>
    </div>
  );
}

function SortableBlocks({
  blocks,
  setBlocks,
  kind,
}: {
  blocks: Block[];
  setBlocks: (blocks: Block[]) => void;
  kind: "todo" | "section";
}) {
  const dragId = useRef<string | null>(null);
  const reorder = (targetId: string) => {
    const sourceId = dragId.current;
    if (!sourceId || sourceId === targetId) return;
    const next = [...blocks];
    const from = next.findIndex((item) => item.id === sourceId);
    const to = next.findIndex((item) => item.id === targetId);
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setBlocks(next);
    dragId.current = null;
  };
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    setBlocks(next);
  };
  const updateBlock = (id: string, patch: Partial<Block>) =>
    setBlocks(
      blocks.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  return (
    <div className="space-y-3">
      {blocks.map((block, index) => (
        <div
          key={block.id}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => reorder(block.id)}
          className={`group rounded-2xl border p-4 ${kind === "todo" ? "border-violet-300/15 bg-violet-500/[.06]" : "border-emerald-300/15 bg-emerald-500/[.06]"}`}
        >
          <div className="flex items-start gap-3">
            <button
              type="button"
              draggable
              aria-label={`Drag to reorder ${kind === "todo" ? "task" : "section"} ${block.title || index + 1}`}
              onDragStart={() => {
                dragId.current = block.id;
              }}
              onDragEnd={() => {
                dragId.current = null;
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  move(index, -1);
                }
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  move(index, 1);
                }
              }}
              className="mt-1 cursor-grab rounded p-1 text-zinc-600 hover:text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-300"
            >
              <GripVertical size={17} />
            </button>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                {kind === "todo" && (
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      aria-label={`Mark ${block.title || "task"} complete`}
                      checked={Boolean(block.done)}
                      onChange={(event) =>
                        updateBlock(block.id, { done: event.target.checked })
                      }
                    />
                    Done
                  </label>
                )}
                <Input
                  aria-label={`${kind === "todo" ? "Task" : "Section"} title`}
                  value={block.title}
                  onChange={(event) =>
                    updateBlock(block.id, { title: event.target.value })
                  }
                  className={`h-9 border-white/10 bg-black/20 font-medium ${block.done ? "text-zinc-500 line-through" : ""}`}
                />
              </div>
              <Textarea
                aria-label={`${kind === "todo" ? "Task" : "Section"} body`}
                value={block.body}
                onChange={(event) =>
                  updateBlock(block.id, { body: event.target.value })
                }
                rows={2}
                className="border-white/10 bg-black/20 text-sm"
              />
            </div>
            <span
              aria-label={`Position ${index + 1}`}
              className="pt-2 text-[10px] text-zinc-600"
            >
              {index + 1}
            </span>
            <Button
              aria-label={`Delete ${kind === "todo" ? "task" : "section"} ${block.title || index + 1}`}
              title={`Delete ${kind === "todo" ? "task" : "section"}`}
              size="icon-sm"
              variant="ghost"
              onClick={() =>
                setBlocks(blocks.filter((item) => item.id !== block.id))
              }
            >
              <Trash2 size={15} />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function StructuredEditor({
  draft,
  update,
  blocks,
  setBlocks,
}: {
  draft: Draft;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  blocks: Block[];
  setBlocks: (blocks: Block[]) => void;
}) {
  const isTodo = draft.content_type === "announcement";
  const addBlock = () =>
    setBlocks([
      ...blocks,
      {
        id: crypto.randomUUID(),
        kind: isTodo ? "todo" : "section",
        title: isTodo ? "New release task" : "New case study section",
        body: "Add details here.",
        done: false,
      },
    ]);
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Title"
          value={draft.title}
          placeholder={isTodo ? "Product update" : "Project name"}
          onChange={(value) => update("title", value)}
        />
        <Field
          label="Summary"
          value={draft.excerpt}
          placeholder="A short overview"
          onChange={(value) => update("excerpt", value)}
        />
      </div>
      <div
        className={`rounded-[32px] border p-6 ${isTodo ? "border-violet-300/20 bg-gradient-to-br from-violet-500/10 to-white/[.03]" : "border-emerald-300/20 bg-gradient-to-br from-emerald-500/10 to-white/[.03]"}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <Badge
              className={
                isTodo
                  ? "bg-violet-400/20 text-violet-100"
                  : "bg-emerald-400/20 text-emerald-100"
              }
            >
              {isTodo ? "Release board" : "Project story"}
            </Badge>
            <h2 className="mt-3 text-2xl font-medium">
              {isTodo ? "Announcement checklist" : "Case study sections"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Drag cards to set their publishing order.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full border-white/15"
            onClick={addBlock}
          >
            <Plus />
            Add {isTodo ? "task" : "section"}
          </Button>
        </div>
        <div className="mt-6">
          <SortableBlocks
            blocks={blocks}
            setBlocks={setBlocks}
            kind={isTodo ? "todo" : "section"}
          />
        </div>
      </div>
    </div>
  );
}

export default function StudioContentPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ ...blank });
  const [query, setQuery] = useState("");
  const [activeFolder, setActiveFolder] = useState<ContentType>("page");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationPending, setMigrationPending] = useState(false);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [media, setMedia] = useState<Asset[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<"body" | "cover">("body");
  const [history, setHistory] = useState<Draft[]>([{ ...blank }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [scheduleValue, setScheduleValue] = useState("");
  const [versions, setVersions] = useState<Version[]>([]);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const savingRef = useRef(false);
  const titleRef = useRef<HTMLDivElement>(null);
  const excerptRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const folder =
    folders.find((item) => item.type === activeFolder) ?? folders[0];
  const folderPages = useMemo(
    () =>
      pages.filter(
        (page) =>
          inferredType(page) === activeFolder &&
          (statusFilter === "all" || page.status === statusFilter) &&
          `${page.title} ${page.slug}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [activeFolder, pages, query, statusFilter],
  );
  const statusCounts = useMemo(
    () => ({
      all: pages.length,
      draft: pages.filter((page) => page.status === "draft").length,
      published: pages.filter((page) => page.status === "published").length,
      archived: pages.filter((page) => page.status === "archived").length,
    }),
    [pages],
  );
  const previewUrl = useMemo(() => {
    const slug = draft.slug || slugify(draft.title);
    return slug
      ? new URL(
          `/${collectionFor[draft.content_type]}/${encodeURIComponent(slug)}`,
          studio.url,
        ).toString()
      : "";
  }, [draft.slug, draft.title]);
  const countFor = (type: ContentType) =>
    pages.filter((page) => inferredType(page) === type).length;
  const setClean = (next: Draft) => {
    setDraft(next);
    setHistory([next]);
    setHistoryIndex(0);
    setBlocks(blockList(next.content_metadata));
    setScheduleValue(
      next.scheduled_at ? toLocalDateTime(next.scheduled_at) : "",
    );
  };
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      setHistory((items) =>
        [...items.slice(0, historyIndex + 1), next].slice(-60),
      );
      setHistoryIndex((index) => Math.min(index + 1, 59));
      return next;
    });
    setDirty(true);
    setUrlCopied(false);
    setError("");
  };
  const updateBlocks = (next: Block[]) => {
    setBlocks(next);
    update("content_metadata", { ...draft.content_metadata, blocks: next });
  };
  const undo = () => {
    if (!historyIndex) return;
    const index = historyIndex - 1;
    setHistoryIndex(index);
    setDraft(history[index]);
    setDirty(true);
  };
  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const index = historyIndex + 1;
    setHistoryIndex(index);
    setDraft(history[index]);
    setDirty(true);
  };
  async function load(preferred?: string | null): Promise<boolean> {
    setLoading(true);
    try {
      const response = await fetch("/api/studio/content", {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Content could not be loaded.");
      const next = (payload.pages ?? []) as Page[];
      setMigrationPending(Boolean(payload.migrationPending));
      const page = next.find((item) => item.id === preferred) ?? next[0];
      setPages(next);
      setSelectedId(page?.id ?? null);
      if (page) {
        const type = inferredType(page);
        setActiveFolder(type);
        setClean(toDraft(page));
      } else setClean({ ...blank, content_type: activeFolder });
      setDirty(false);
      setError("");
      return true;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Content could not be loaded.",
      );
      return false;
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedType = folders.find(
      (item) => item.type === params.get("new"),
    )?.type;
    void load().then((loaded) => {
      if (!loaded || !requestedType) return;
      newContent(requestedType);
      window.history.replaceState(null, "", "/studio/content");
    });
  }, []);
  useEffect(() => {
    if (titleRef.current && titleRef.current.innerText !== draft.title)
      titleRef.current.innerText = draft.title;
    if (excerptRef.current && excerptRef.current.innerText !== draft.excerpt)
      excerptRef.current.innerText = draft.excerpt;
  }, [draft.title, draft.excerpt]);
  async function save(
    status: Status = draft.status,
    notify = true,
  ): Promise<Page | null> {
    if (savingRef.current) return null;
    if (!draft.title.trim()) {
      setError("Add a title before saving.");
      return null;
    }
    if (draft.content_type === "testimonial") {
      const rating = Number(draft.content_metadata.rating ?? 5);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        setError("Rating must be a whole number from 1 to 5.");
        return null;
      }
    }
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/studio/content", {
        method: selectedId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...draft,
          id: selectedId,
          status,
          slug: draft.slug || slugify(draft.title),
        }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Content could not be saved.");
      const page = payload.page as Page;
      const savedDraft = {
        ...toDraft(page),
        content_type: draft.content_type,
        content_metadata: page.content_metadata ?? draft.content_metadata,
      };
      setPages((current) => [
        page,
        ...current.filter((item) => item.id !== page.id),
      ]);
      setSelectedId(page.id);
      setClean(savedDraft);
      setDirty(false);
      if (notify) {
        studioToast.success(
          status === "published" ? "Content published" : "Draft saved",
        );
      }
      return page;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Content could not be saved.",
      );
      return null;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  async function openMedia(target: "body" | "cover") {
    setMediaTarget(target);
    setMediaOpen(true);
    setMediaLoading(true);
    setError("");
    try {
      const response = await fetch("/api/studio/media", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Media library could not be loaded.");
      setMedia(
        (payload.assets ?? []).filter(
          (item: Asset & { type?: string }) =>
            item.type === "Image" || item.type === "SVG",
        ),
      );
    } catch (caught) {
      setMedia([]);
      setError(
        caught instanceof Error
          ? caught.message
          : "Media library could not be loaded.",
      );
    } finally {
      setMediaLoading(false);
    }
  }
  async function copyPreviewUrl() {
    if (!previewUrl) {
      setError("Add a title or slug to create a content URL.");
      return;
    }
    try {
      await window.navigator.clipboard.writeText(previewUrl);
      setUrlCopied(true);
      studioToast.success("Content URL copied");
      setError("");
    } catch {
      setError(
        "The URL could not be copied. Copy it from the URL preview field.",
      );
      setUrlCopied(false);
    }
  }
  function insertImage(asset: Asset) {
    const url = safeImageUrl(asset.publicUrl ?? "");
    if (!url) {
      setError("This image has no safe HTTPS or relative public URL.");
      return;
    }
    if (mediaTarget === "cover") update("featured_image_url", url);
    else {
      const current = contentRef.current?.value ?? draft.content;
      const start = contentRef.current?.selectionStart ?? current.length;
      const end = contentRef.current?.selectionEnd ?? start;
      const image = `![${asset.altText || asset.fileName}](${url})`;
      const prefix = start > 0 && current[start - 1] !== "\n" ? "\n\n" : "";
      const suffix =
        end < current.length && current[end] !== "\n" ? "\n\n" : "";
      update(
        "content",
        `${current.slice(0, start)}${prefix}${image}${suffix}${current.slice(end)}`,
      );
    }
    setMediaOpen(false);
  }
  function select(page: Page) {
    if (savingRef.current) {
      setError("Wait for the current save to finish before switching content.");
      return;
    }
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    setActiveFolder(inferredType(page));
    setClean(toDraft(page));
    setSelectedId(page.id);
    setDirty(false);
    setError("");
  }
  function switchFolder(type: ContentType) {
    if (type === activeFolder) return;
    if (savingRef.current) {
      setError("Wait for the current save to finish before switching folders.");
      return;
    }
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    const next = pages.find((page) => inferredType(page) === type);
    setActiveFolder(type);
    setSelectedId(next?.id ?? null);
    setClean(next ? toDraft(next) : { ...blank, content_type: type });
    setDirty(false);
    setError("");
  }
  function newContent(type: ContentType = activeFolder) {
    if (savingRef.current) {
      setError(
        "Wait for the current save to finish before starting new content.",
      );
      return;
    }
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    setActiveFolder(type);
    setSelectedId(null);
    setClean({ ...blank, content_type: type });
    setDirty(false);
    setPreview(false);
    setError("");
  }
  function format(command: string, value?: string) {
    if (command === "createLink" && !safeImageUrl(value ?? "")) {
      setError("Use an HTTPS or site-relative URL for links.");
      return;
    }
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = draft.content.slice(start, end);
    const replacement =
      command === "bold"
        ? `**${selected || "bold text"}**`
        : command === "italic"
          ? `*${selected || "italic text"}*`
          : command === "createLink"
            ? `[${selected || "link text"}](${value})`
            : selected
                .split("\n")
                .map((line) => `> ${line}`)
                .join("\n");
    const next = `${draft.content.slice(0, start)}${replacement}${draft.content.slice(end)}`;
    update("content", next);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + replacement.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }
  async function workflow(action: "submit" | "approve" | "reject") {
    let targetId = selectedId;
    if (dirty) {
      const saved = await save(draft.status, false);
      if (!saved) return;
      targetId = saved.id;
    }
    if (!targetId) {
      setError("Save this content before changing its workflow.");
      return;
    }
    setWorkflowBusy(true);
    try {
      const response = await fetch(`/api/studio/content/${targetId}/workflow`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Workflow update failed.");
      setPages((current) =>
        current.map((item) =>
          item.id === targetId ? { ...item, ...payload.page } : item,
        ),
      );
      setClean({
        ...draft,
        status: payload.page.status,
        workflow_status: payload.page.workflow_status,
      });
      studioToast.success(
        action === "submit"
          ? "Submitted for review"
          : action === "approve"
            ? "Content approved"
            : "Content rejected",
      );
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Workflow update failed.",
      );
    } finally {
      setWorkflowBusy(false);
    }
  }
  async function schedule() {
    let targetId = selectedId;
    if (dirty) {
      const saved = await save(draft.status, false);
      if (!saved) return;
      targetId = saved.id;
    }
    const scheduledAt = new Date(scheduleValue);
    if (!targetId) return setError("Save this content before scheduling it.");
    if (
      !scheduleValue ||
      Number.isNaN(scheduledAt.getTime()) ||
      scheduledAt.getTime() <= Date.now()
    )
      return setError("Choose a future publish date and time.");
    setWorkflowBusy(true);
    try {
      const response = await fetch(`/api/studio/content/${targetId}/schedule`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scheduled_at: scheduledAt.toISOString() }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Schedule could not be saved.");
      setDraft((current) => ({
        ...current,
        status: payload.page.status,
        scheduled_at: payload.page.scheduled_at,
        workflow_status: payload.page.workflow_status,
      }));
      setPages((current) =>
        current.map((item) =>
          item.id === targetId ? { ...item, ...payload.page } : item,
        ),
      );
      setDirty(false);
      studioToast.success(
        "Publication scheduled",
        scheduledAt.toLocaleString(),
      );
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Schedule could not be saved.",
      );
    } finally {
      setWorkflowBusy(false);
    }
  }
  async function showVersions() {
    if (!selectedId)
      return setError("Save this content before viewing version history.");
    setVersionsOpen(true);
    try {
      const response = await fetch(
        `/api/studio/content/${selectedId}/versions`,
        { cache: "no-store" },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          payload.error || "Version history could not be loaded.",
        );
      setVersions(payload.versions ?? []);
      setError("");
    } catch (caught) {
      setVersions([]);
      setError(
        caught instanceof Error
          ? caught.message
          : "Version history could not be loaded.",
      );
    }
  }
  async function restoreVersion(version: number) {
    if (
      !selectedId ||
      !window.confirm(
        `Restore version ${version}?${dirty ? " Your unsaved edits will be discarded, and the current content will be saved as a new draft." : " The current content will be saved as a new draft."}`,
      )
    )
      return;
    try {
      const response = await fetch(
        `/api/studio/content/${selectedId}/versions/${version}/restore`,
        { method: "POST" },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Version could not be restored.");
      const restored = payload.page as Page;
      setPages((current) =>
        current.map((item) => (item.id === restored.id ? restored : item)),
      );
      setClean(toDraft(restored));
      setDirty(false);
      setVersionsOpen(false);
      studioToast.success(
        `Version ${version} restored`,
        "The restored content is saved as a draft.",
      );
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Version could not be restored.",
      );
    }
  }
  async function deleteContent() {
    if (
      !selectedId ||
      !window.confirm(
        `Delete "${draft.title}"? This cannot be undone. Media assets will not be deleted.`,
      )
    )
      return;
    const removedId = selectedId;
    try {
      const response = await fetch(
        `/api/studio/content?id=${encodeURIComponent(removedId)}`,
        { method: "DELETE" },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Content could not be deleted.");
      const listResponse = await fetch("/api/studio/content", {
        cache: "no-store",
      });
      const listPayload = await listResponse.json();
      if (!listResponse.ok)
        throw new Error(
          listPayload.error ||
            "Content was deleted, but the content list could not be refreshed.",
        );
      const nextPages = (listPayload.pages ?? []) as Page[];
      const nextPage = nextPages.find(
        (page) =>
          inferredType(page) === activeFolder &&
          (statusFilter === "all" || page.status === statusFilter),
      );
      setPages(nextPages);
      setSelectedId(nextPage?.id ?? null);
      setClean(
        nextPage ? toDraft(nextPage) : { ...blank, content_type: activeFolder },
      );
      setDirty(false);
      studioToast.success(
        "Content deleted",
        "Media assets were left untouched.",
      );
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Content could not be deleted.",
      );
    }
  }
  const editor =
    draft.content_type === "page" || draft.content_type === "blog" ? (
      <ArticleEditor
        draft={draft}
        update={update}
        titleRef={titleRef}
        excerptRef={excerptRef}
        contentRef={contentRef}
        openMedia={(target) => void openMedia(target)}
        format={format}
        undo={undo}
        redo={redo}
        save={() => void save("draft")}
      />
    ) : draft.content_type === "testimonial" ? (
      <TestimonialEditor draft={draft} update={update} />
    ) : (
      <StructuredEditor
        draft={draft}
        update={update}
        blocks={blocks}
        setBlocks={updateBlocks}
      />
    );

  const coverUrl = safeImageUrl(draft.featured_image_url);
  const previewRating = Number(draft.content_metadata.rating ?? 5);
  const validPreviewRating =
    Number.isInteger(previewRating) && previewRating >= 1 && previewRating <= 5;
  const editorWordCount = draft.content.trim()
    ? draft.content.trim().split(/\s+/).length
    : 0;
  const completedBlocks = blocks.filter((block) => block.done).length;
  return (
    <div className="h-[calc(100vh-32px)] overflow-hidden p-5 max-[1180px]:h-auto max-[1180px]:min-h-[calc(100vh-32px)] max-[1180px]:overflow-visible max-md:p-3">
      <div className="grid h-full min-h-0 grid-cols-[292px_minmax(0,1fr)_304px] gap-5 max-[1180px]:h-auto max-[1180px]:min-h-[calc(100vh-72px)] max-[1180px]:grid-cols-[248px_minmax(0,1fr)] max-[1180px]:[&>aside:last-child]:col-span-2 max-md:grid-cols-1 max-md:[&>aside:last-child]:col-span-1">
        <aside
          aria-label="Content layers"
          className="sticky top-5 flex h-full max-h-[calc(100vh-72px)] min-h-0 flex-col gap-4 overflow-hidden rounded-[28px] border border-white/[.11] bg-[#151517]/95 p-4 shadow-2xl shadow-black/20 max-[1180px]:h-auto max-[1180px]:max-h-[calc(100vh-40px)] max-md:max-h-[46vh]"
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/[.08] pb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-zinc-100">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-orange-300/15 bg-orange-300/[.08] text-orange-300">
                  <Layers3 size={15} />
                </span>
                <p className="truncate text-sm font-medium tracking-tight">
                  Content layers
                </p>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                Organize and edit your pages, stories, and updates.
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="Create content"
                  title="Create content"
                  size="sm"
                  className="h-8 shrink-0 gap-1.5 rounded-lg bg-white px-2.5 text-xs font-medium text-black hover:bg-orange-100"
                >
                  <Plus size={15} />
                  New
                  <ChevronDown size={13} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-56 rounded-xl border border-white/10 bg-[#202024] p-1.5 text-zinc-100 shadow-xl"
              >
                <p className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-[.14em] text-zinc-500">
                  Create content
                </p>
                {folders.map((item) => (
                  <DropdownMenuItem
                    key={item.type}
                    className="rounded-lg px-2 py-2 text-xs focus:bg-white/[.08] focus:text-white"
                    onClick={() => newContent(item.type)}
                  >
                    <Folder size={14} className="text-orange-300" />
                    New{" "}
                    {item.type === "case_study"
                      ? "case study"
                      : item.title.replace(/s$/, "")}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <Input
                aria-label="Search content"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search pages and content…"
                className="h-9 rounded-lg border-white/10 bg-black/20 pl-9 text-xs placeholder:text-zinc-600 focus-visible:border-orange-300/40"
              />
            </div>
            <div
              className="flex gap-1 overflow-x-auto rounded-lg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label="Filter content by status"
            >
              {(["all", "draft", "published", "archived"] as const).map(
                (status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={statusFilter === status ? "default" : "ghost"}
                    aria-pressed={statusFilter === status}
                    className={`h-7 min-w-[68px] shrink-0 justify-between gap-1.5 rounded-md px-2 text-[10px] ${statusFilter === status ? "bg-orange-300/15 text-orange-100 hover:bg-orange-300/20" : "text-zinc-500 hover:bg-white/[.05] hover:text-zinc-200"}`}
                    onClick={() => setStatusFilter(status)}
                  >
                    <span>
                      {status === "all" ? "All" : statusLabel(status)}
                    </span>
                    <span className="tabular-nums opacity-60">
                      {statusCounts[status]}
                    </span>
                  </Button>
                ),
              )}
            </div>
          </div>
          <div
            className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Folders and content"
          >
            <p className="px-2 pb-2 text-[10px] font-medium uppercase tracking-[.16em] text-zinc-600">
              Workspace
            </p>
            <div className="space-y-0.5">
              {folders.map((item) => (
                <Fragment key={item.type}>
                  <button
                    type="button"
                    aria-current={
                      activeFolder === item.type ? "page" : undefined
                    }
                    aria-expanded={activeFolder === item.type}
                    onClick={() => switchFolder(item.type)}
                    className={`group flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-300 ${activeFolder === item.type ? "bg-white/[.055] text-orange-200" : "text-zinc-400 hover:bg-white/[.035] hover:text-zinc-100"}`}
                  >
                    <ChevronDown
                      aria-hidden="true"
                      size={13}
                      className={`shrink-0 text-zinc-600 transition-transform ${activeFolder === item.type ? "" : "-rotate-90"}`}
                    />
                    <Folder
                      size={15}
                      className={
                        activeFolder === item.type
                          ? "text-orange-300"
                          : "text-zinc-500 group-hover:text-zinc-300"
                      }
                    />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">
                      {item.title}
                    </span>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${activeFolder === item.type ? "bg-orange-300/10 text-orange-200" : "text-zinc-600"}`}
                    >
                      {countFor(item.type)}
                    </span>
                  </button>
                  {activeFolder === item.type && (
                    <div className="ml-[14px] border-l border-white/[.09] pb-2 pl-2">
                      <div className="space-y-0.5" aria-live="polite">
                        <StudioLoadTransition
                          loading={loading}
                          label="Loading layers…"
                          loadingClassName="justify-start px-2 py-3 text-xs"
                        >
                        {folderPages.length ? (
                          folderPages.map((page) => (
                            <button
                              key={page.id}
                              type="button"
                              aria-current={
                                selectedId === page.id ? "page" : undefined
                              }
                              onClick={() => select(page)}
                              className={`flex w-full items-center gap-2 border-l-2 py-2 pl-2 pr-1 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-300 ${selectedId === page.id ? "border-orange-300 text-orange-100" : "border-transparent text-zinc-400 hover:text-zinc-100"}`}
                            >
                              <FileText
                                size={13}
                                className={
                                  selectedId === page.id
                                    ? "shrink-0 text-orange-300"
                                    : "shrink-0 text-zinc-600"
                                }
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs">
                                  {page.title}
                                </span>
                                <span className="mt-0.5 block truncate text-[10px] text-zinc-600">
                                  /{page.slug}
                                </span>
                              </span>
                              <span
                                aria-label={statusLabel(page.status)}
                                className={`size-1.5 shrink-0 rounded-full ${page.status === "published" ? "bg-emerald-400" : "bg-amber-300"}`}
                              />
                            </button>
                          ))
                        ) : (
                          <Empty className="border-none bg-transparent p-4 text-center">
                            <EmptyHeader className="gap-1">
                              <EmptyMedia variant="icon" className="size-8 rounded-lg mb-1">
                                <FileText className="size-4 text-zinc-500" />
                              </EmptyMedia>
                              <EmptyTitle className="text-xs text-zinc-400">No matching layers</EmptyTitle>
                              <EmptyDescription className="text-[10px] text-zinc-600">
                                Create a new entry in this layer.
                              </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 rounded-full border-white/10 px-3 text-[11px]"
                                onClick={() => newContent()}
                              >
                                <Plus size={12} className="mr-1" />
                                Create content
                              </Button>
                            </EmptyContent>
                          </Empty>
                        )}
                        </StudioLoadTransition>
                      </div>
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-white/[.08] pt-3">
            <span className="text-[10px] text-zinc-500">Library total</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium tabular-nums text-zinc-300">
              {pages.length} items
            </span>
          </div>
        </aside>
        <main className="h-full min-h-0 min-w-0 overflow-y-auto px-8 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-[1180px]:h-[calc(100vh-40px)] max-md:px-4">
          <header className="flex flex-wrap items-center gap-2 border-b border-white/[.08] pb-5">
            <Link
              href="/studio"
              className="inline-flex items-center gap-1 text-xs text-zinc-500 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-300"
            >
              <ArrowLeft size={14} />
              Back
            </Link>
            <span aria-hidden="true" className="text-zinc-700">
              /
            </span>
            <span className="text-xs text-zinc-300">
              Content / {folder.title}
            </span>
            <span className="flex-1" />
            <span
              role="status"
              className="mr-2 hidden items-center gap-1.5 text-[11px] text-zinc-500 sm:flex"
            >
              <span
                className={`size-1.5 rounded-full ${saving ? "animate-pulse bg-orange-300" : dirty ? "bg-amber-300" : "bg-emerald-400"}`}
              />
              {saving
                ? "Saving…"
                : dirty
                  ? "Unsaved changes"
                  : "Saved"}
            </span>
            <Button
              aria-pressed={preview}
              size="sm"
              variant={preview ? "default" : "outline"}
              className="rounded-xl border-white/15"
              onClick={() => setPreview(!preview)}
            >
              <Eye size={15} />
              {preview ? "Edit" : "Preview"}
            </Button>
          </header>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-2xl bg-red-300/10 p-3 text-sm text-red-100"
            >
              {error}
            </p>
          )}
          {migrationPending && (
            <p
              role="status"
              className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100"
            >
              The database is using the legacy content schema. Apply the latest
              Supabase migrations to enable typed content, structured blocks,
              workflow, and version history.
            </p>
          )}
          {preview ? (
            <article className="mx-auto max-w-[720px] py-12">
              {coverUrl && (
                <img
                  src={coverUrl}
                  alt=""
                  className="mb-8 max-h-80 w-full rounded-3xl object-cover"
                />
              )}
              <Badge>{statusLabel(draft.status)}</Badge>
              <h1 className="mt-5 text-5xl font-extralight">
                {draft.title || "Untitled"}
              </h1>
              <p className="mt-4 text-xl text-zinc-400">{draft.excerpt}</p>
              <div className="prose prose-invert mt-8">
                {draft.content_type === "testimonial" ? (
                  <blockquote className="whitespace-pre-wrap">
                    {draft.content}
                    <footer className="mt-4 text-base not-italic text-zinc-400">
                      — {text(draft.content_metadata.person)}
                      {text(draft.content_metadata.role)
                        ? `, ${text(draft.content_metadata.role)}`
                        : ""}
                      {validPreviewRating && (
                        <span
                          className="ml-3 text-pink-200"
                          aria-label={`${previewRating} out of 5 stars`}
                        >
                          {"★".repeat(previewRating)}
                          {"☆".repeat(5 - previewRating)}
                        </span>
                      )}
                    </footer>
                  </blockquote>
                ) : draft.content_type === "case_study" ||
                  draft.content_type === "announcement" ? (
                  blocks.map((block, index) => (
                    <section key={block.id} className="my-6">
                      <h2>{block.title}</h2>
                      <p className="whitespace-pre-wrap">{block.body}</p>
                      {draft.content_type === "announcement" && (
                        <p>{block.done ? "Complete" : "Not complete"}</p>
                      )}
                      {index < blocks.length - 1 && <hr />}
                    </section>
                  ))
                ) : (
                  <ContentBody content={draft.content} />
                )}
              </div>
            </article>
          ) : (
            <section className="mx-auto max-w-[760px] py-8">{editor}</section>
          )}
        </main>
        <aside className="sticky top-4 flex max-h-[calc(100vh-40px)] flex-col gap-5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-[28px] border border-white/[.11] bg-[#151517]/95 p-4 shadow-2xl shadow-black/20 max-[1180px]:static max-[1180px]:max-h-none">
          <div className="rounded-2xl border border-orange-300/20 bg-gradient-to-br from-orange-400/[.14] to-transparent p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg bg-orange-300/15 text-orange-200">
                    <CheckCircle2 size={15} />
                  </span>
                  <span className="text-sm font-medium">Publishing</span>
                </div>
                <p className="mt-3 text-[11px] capitalize text-zinc-400">
                  {draft.workflow_status.replaceAll("_", " ")} workflow
                </p>
                <p role="status" className="mt-1 text-[11px] text-zinc-500">
                  {saving
                    ? "Saving…"
                    : dirty
                      ? "Unsaved changes"
                      : "Saved"}
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-orange-200/25 bg-orange-300/10 text-orange-100"
              >
                {statusLabel(draft.status)}
              </Badge>
            </div>
          </div>
          <section
            aria-label={`${folder.title} editor details`}
            className="rounded-2xl border border-white/[.08] bg-black/20 p-3"
          >
            <p className="text-[10px] font-medium uppercase tracking-[.16em] text-zinc-500">
              {draft.content_type === "testimonial"
                ? "Testimonial details"
                : draft.content_type === "case_study"
                  ? "Case study progress"
                  : draft.content_type === "announcement"
                    ? "Announcement progress"
                    : "Editorial details"}
            </p>
            {draft.content_type === "testimonial" ? (
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-500">Person</span>
                  <span className="truncate text-zinc-200">
                    {text(draft.content_metadata.person) || "Not set"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-500">Role / company</span>
                  <span className="truncate text-zinc-200">
                    {text(draft.content_metadata.role) || "Not set"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Rating</span>
                  <span
                    className={
                      validPreviewRating ? "text-amber-200" : "text-red-300"
                    }
                  >
                    {validPreviewRating
                      ? `${"★".repeat(previewRating)}${"☆".repeat(5 - previewRating)} (${previewRating}/5)`
                      : "Check rating"}
                  </span>
                </div>
              </div>
            ) : draft.content_type === "case_study" ||
              draft.content_type === "announcement" ? (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">
                    {draft.content_type === "announcement"
                      ? "Tasks complete"
                      : "Story sections"}
                  </span>
                  <span className="tabular-nums text-zinc-200">
                    {draft.content_type === "announcement"
                      ? `${completedBlocks} / ${blocks.length}`
                      : blocks.length}
                  </span>
                </div>
                {draft.content_type === "announcement" && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.08]">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-[width]"
                      style={{
                        width: `${blocks.length ? (completedBlocks / blocks.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                )}
                <p className="mt-2 text-[10px] text-zinc-600">
                  {draft.content_type === "announcement"
                    ? "Update tasks and completion in the checklist."
                    : "Add, edit, or reorder story sections in the editor."}
                </p>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white/[.035] p-2">
                  <p className="text-zinc-500">Words</p>
                  <p className="mt-1 font-medium tabular-nums text-zinc-200">
                    {editorWordCount}
                  </p>
                </div>
                <div className="rounded-lg bg-white/[.035] p-2">
                  <p className="text-zinc-500">Reading time</p>
                  <p className="mt-1 font-medium text-zinc-200">
                    {Math.max(1, Math.ceil(editorWordCount / 220))} min
                  </p>
                </div>
              </div>
            )}
          </section>
          <div className="space-y-4">
            <p className="text-[10px] font-medium uppercase tracking-[.16em] text-zinc-600">
              {draft.content_type === "blog"
                ? "Article settings"
                : draft.content_type === "testimonial"
                  ? "Search settings"
                  : draft.content_type === "case_study"
                    ? "Case study settings"
                    : draft.content_type === "announcement"
                      ? "Announcement settings"
                      : "Page settings"}
            </p>
            <label className="block text-xs text-zinc-400">
              Slug
              <Input
                value={draft.slug}
                onChange={(event) =>
                  update("slug", slugify(event.target.value))
                }
                className="mt-1 rounded-xl border-white/10 bg-white/[.045]"
              />
            </label>
            <label className="block text-xs text-zinc-400">
              SEO title
              <Input
                value={draft.seo_title}
                onChange={(event) => update("seo_title", event.target.value)}
                className="mt-1 rounded-xl border-white/10 bg-white/[.045]"
              />
            </label>
            <label className="block text-xs text-zinc-400">
              SEO description
              <Textarea
                value={draft.seo_description}
                onChange={(event) =>
                  update("seo_description", event.target.value)
                }
                rows={4}
                className="mt-1 rounded-xl border-white/10 bg-white/[.045]"
              />
            </label>
          </div>
          <section
            aria-label="URL preview"
            className="rounded-2xl border border-white/[.09] bg-black/20 p-3"
          >
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-200">
              <Link2 size={14} className="text-orange-300" />
              URL preview
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-white/[.07] bg-black/20 p-1.5">
              <code
                className="min-w-0 flex-1 truncate px-1 text-[10px] text-zinc-400"
                title={previewUrl}
              >
                {previewUrl || "Add a title or slug to preview the URL"}
              </code>
              <Button
                aria-label={urlCopied ? "URL copied" : "Copy content URL"}
                title={urlCopied ? "Copied" : "Copy URL"}
                size="icon-sm"
                variant="ghost"
                disabled={!previewUrl}
                onClick={() => void copyPreviewUrl()}
              >
                {urlCopied ? <Check size={14} /> : <Copy size={14} />}
              </Button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-lg border-white/10 text-[11px]"
                onClick={() => setPreview(true)}
              >
                <Eye size={13} />
                Preview draft
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-lg border-white/10 text-[11px]"
                disabled={
                  !selectedId ||
                  draft.status !== "published" ||
                  dirty ||
                  !previewUrl
                }
                onClick={() =>
                  window.open(previewUrl, "_blank", "noopener,noreferrer")
                }
              >
                <ExternalLink size={13} />
                Open live URL
              </Button>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">
              {selectedId && draft.status === "published"
                ? dirty
                  ? "Save your edits before opening the published page."
                  : "This content is published."
                : "Publish this content to make the public URL available."}
            </p>
          </section>
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="rounded-xl bg-white text-black hover:bg-orange-100"
              disabled={saving}
              onClick={() => void save("published")}
            >
              {saving ? "Saving…" : "Publish"}
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-white/15"
              disabled={saving}
              onClick={() => void save("draft")}
            >
              <Save size={15} />
              Save draft
            </Button>
          </div>
          <div className="border-t border-white/[.08] pt-4">
            <div className="mb-2 flex items-center gap-2">
              <Clock3 size={14} className="text-zinc-500" />
              <p className="text-[10px] font-medium uppercase tracking-[.16em] text-zinc-600">
                Schedule
              </p>
            </div>
            <label className="block text-xs text-zinc-400">
              <span className="sr-only">Schedule publish</span>
              <Input
                type="datetime-local"
                value={scheduleValue}
                onChange={(event) => setScheduleValue(event.target.value)}
                className="border-white/10 bg-white/[.045]"
              />
            </label>
            <Button
              variant="outline"
              className="mt-2 w-full rounded-xl border-white/15"
              disabled={saving || workflowBusy}
              onClick={() => void schedule()}
            >
              Schedule publish
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="rounded-xl border-white/10 text-xs"
              disabled={saving || workflowBusy}
              onClick={() => void workflow("submit")}
            >
              Submit review
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-white/10 text-xs"
              disabled={saving || workflowBusy}
              onClick={() => void workflow("approve")}
            >
              Approve
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-white/10 text-xs"
              disabled={saving || workflowBusy}
              onClick={() => void workflow("reject")}
            >
              Reject
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-white/10 text-xs"
              disabled={!selectedId}
              onClick={() => void showVersions()}
            >
              History
            </Button>
          </div>
          <div className="mt-auto border-t border-white/10 pt-3">
            <Button
              variant="destructive"
              className="w-full"
              disabled={!selectedId || saving}
              onClick={() => void deleteContent()}
            >
              <Trash2 />
              Delete content
            </Button>
            <p className="mt-2 text-[10px] text-zinc-500">
              Deleting content does not remove its media assets.
            </p>
          </div>
        </aside>
      </div>
      {mediaOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="media-dialog-title"
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          onClick={() => setMediaOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setMediaOpen(false);
          }}
        >
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/15 bg-[#202024] p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-between">
              <h2 id="media-dialog-title" className="text-xl">
                {mediaTarget === "cover"
                  ? "Select cover image"
                  : "Insert body image"}
              </h2>
              <Button variant="ghost" onClick={() => setMediaOpen(false)}>
                Close
              </Button>
            </div>
            <StudioLoadTransition
              loading={mediaLoading}
              label="Loading media…"
              loadingClassName="min-h-32"
            >
            {media.length ? (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {media.map((asset) => {
                  const url = safeImageUrl(asset.publicUrl ?? "");
                  return (
                    <button
                      key={asset.key}
                      type="button"
                      disabled={!url}
                      aria-label={`${mediaTarget === "cover" ? "Use as cover" : "Insert"} ${asset.altText || asset.fileName}`}
                      onClick={() => insertImage(asset)}
                      className="overflow-hidden rounded-2xl border border-white/10 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-300 disabled:opacity-50"
                    >
                      <div className="h-32 bg-white/[.05]">
                        {url && (
                          <img
                            src={url}
                            alt={asset.altText || asset.fileName}
                            className="size-full object-cover"
                          />
                        )}
                      </div>
                      <p className="truncate p-2 text-xs">{asset.fileName}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p
                role="status"
                className="py-8 text-center text-sm text-zinc-400"
              >
                No images are available in the media library.
              </p>
            )}
            </StudioLoadTransition>
          </div>
        </div>
      )}
      {versionsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="versions-dialog-title"
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          onClick={() => setVersionsOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setVersionsOpen(false);
          }}
        >
          <div
            className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/15 bg-[#202024] p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-between">
              <h2 id="versions-dialog-title" className="text-xl">
                Version history
              </h2>
              <Button variant="ghost" onClick={() => setVersionsOpen(false)}>
                Close
              </Button>
            </div>
            {versions.length ? (
              <ul className="mt-5 space-y-3">
                {versions.map((version) => (
                  <li
                    key={version.version}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3"
                  >
                    <div>
                      <p className="text-sm">
                        Version {version.version}:{" "}
                        {text(version.snapshot.title) || "Untitled"}
                      </p>
                      <time className="text-xs text-zinc-500">
                        {new Date(version.created_at).toLocaleString()}
                      </time>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void restoreVersion(version.version)}
                    >
                      Restore
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p
                role="status"
                className="py-8 text-center text-sm text-zinc-400"
              >
                No saved versions are available.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
