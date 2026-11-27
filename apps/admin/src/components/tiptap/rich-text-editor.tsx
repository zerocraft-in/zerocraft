"use client";

import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Textarea } from "@zerocraft/ui/textarea";
import { cn } from "@/lib/utils";
import { getExtensions } from "./extensions";
import { EditorToolbar, type EditorDialog } from "./toolbar";
import { ImageDialog, LinkDialog, VideoDialog } from "./dialogs";

/* Content styling lives here (no @tailwindcss/typography needed). */
const CONTENT_CLASS = [
  "min-h-[var(--rte-min-height)] px-3 py-3 text-sm leading-relaxed outline-none break-words",
  "[&_p]:my-2 [&>:first-child]:mt-0",
  "[&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-2xl [&_h1]:font-bold",
  "[&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold",
  "[&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold",
  "[&_h4]:mb-1.5 [&_h4]:mt-3 [&_h4]:text-base [&_h4]:font-semibold",
  "[&_h5]:mb-1.5 [&_h5]:mt-3 [&_h5]:text-sm [&_h5]:font-semibold",
  "[&_h6]:mb-1.5 [&_h6]:mt-3 [&_h6]:text-xs [&_h6]:font-semibold",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li>p]:my-0",
  "[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs",
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_a]:cursor-pointer [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
  "[&_hr]:my-4 [&_hr]:border-border",
  "[&_img]:my-2 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-md",
  "[&_.ProseMirror-selectednode]:outline [&_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror-selectednode]:outline-ring",
  "[&_table]:my-3 [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse",
  "[&_td]:relative [&_td]:min-w-[3rem] [&_td]:border [&_td]:border-border [&_td]:p-2 [&_td]:align-top",
  "[&_th]:relative [&_th]:min-w-[3rem] [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold",
  "[&_td>p]:my-0 [&_th>p]:my-0 [&_.selectedCell]:bg-primary/10 [&_.tableWrapper]:overflow-x-auto",
  "[&_.column-resize-handle]:absolute [&_.column-resize-handle]:-right-px [&_.column-resize-handle]:bottom-0 [&_.column-resize-handle]:top-0 [&_.column-resize-handle]:w-0.5 [&_.column-resize-handle]:bg-primary",
  "[&_.resize-cursor]:cursor-col-resize",
  "[&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-muted-foreground [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
].join(" ");

/** light pretty-print so the HTML view is readable */
function formatHtml(html: string) {
  return html.replace(/(<\/(?:p|h[1-6]|ul|ol|li|blockquote|pre|table|tr|thead|tbody)>|<hr\s*\/?>)/g, "$1\n").trim();
}

export interface RichTextEditorProps {
  /** HTML string */
  value?: string;
  onChange?: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  className?: string;
  /** min height of the writing area (default 154px, like the Shopify editor) */
  minHeight?: number | string;
  /** optional scroll limit for long content */
  maxHeight?: number | string;
  /** when provided the image dialog shows an "Upload image" button. Resolve with the final image URL. */
  onUploadImage?: (file: File) => Promise<string>;
}

const toCss = (v: number | string) => (typeof v === "number" ? `${v}px` : v);

export function RichTextEditor({
  value = "",
  onChange,
  onBlur,
  placeholder = "",
  disabled = false,
  invalid = false,
  id,
  className,
  minHeight = 154,
  maxHeight,
  onUploadImage,
}: RichTextEditorProps) {
  const [htmlMode, setHtmlMode] = React.useState(false);
  const [htmlDraft, setHtmlDraft] = React.useState("");
  const [dialog, setDialog] = React.useState<EditorDialog | null>(null);

  // keep latest callbacks without re-creating the editor
  const onChangeRef = React.useRef(onChange);
  const onBlurRef = React.useRef(onBlur);
  React.useEffect(() => {
    onChangeRef.current = onChange;
    onBlurRef.current = onBlur;
  });

  const extensions = React.useMemo(() => getExtensions(placeholder), [placeholder]);

  const editor = useEditor({
    extensions,
    content: value,
    editable: !disabled,
    immediatelyRender: false, // Next.js SSR safe
    shouldRerenderOnTransaction: true, // toolbar active states stay in sync
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        role: "textbox",
        "aria-multiline": "true",
        class: CONTENT_CLASS,
      },
    },
    onUpdate: ({ editor: e }) => onChangeRef.current?.(e.isEmpty ? "" : e.getHTML()),
    onBlur: () => onBlurRef.current?.(),
  });

  /* external value changes (form reset, async load) */
  React.useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if ((value ?? "") !== current) editor.commands.setContent(value ?? "", false);
  }, [value, editor]);

  React.useEffect(() => {
    if (editor && !editor.isDestroyed) editor.setEditable(!disabled);
  }, [disabled, editor]);

  const closeDialog = () => {
    setDialog(null);
    editor?.commands.focus();
  };

  const toggleHtml = () => {
    if (!editor) return;
    if (!htmlMode) setHtmlDraft(formatHtml(editor.isEmpty ? "" : editor.getHTML()));
    setHtmlMode((m) => !m);
  };

  const handleHtmlChange = (next: string) => {
    setHtmlDraft(next);
    editor?.commands.setContent(next, true); // emits update -> onChange
  };

  /* ── dialog actions ── */
  const applyLink = ({ href, newTab }: { href: string; newTab: boolean }) => {
    if (!editor) return;
    const attrs = { href, target: newTab ? "_blank" : null };
    const { from, to } = editor.state.selection;
    if (editor.isActive("link")) {
      editor.chain().focus().extendMarkRange("link").setLink(attrs).run();
    } else if (from === to) {
      editor
        .chain()
        .focus()
        .insertContent({ type: "text", text: href, marks: [{ type: "link", attrs }] })
        .run();
    } else {
      editor.chain().focus().setLink(attrs).run();
    }
    setDialog(null);
  };

  const removeLink = () => {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    setDialog(null);
  };

  const linkAttrs = editor?.getAttributes("link") ?? {};

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-input bg-background transition-shadow",
        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30",
        invalid && "border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
        disabled && "opacity-60",
        className,
      )}
      style={{ ["--rte-min-height" as string]: toCss(minHeight) }}
      data-invalid={invalid || undefined}
      onKeyDown={(e) => {
        if (!editor || htmlMode || disabled) return;
        if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "k") {
          e.preventDefault();
          setDialog("link");
        }
      }}
    >
      {editor ? (
        <EditorToolbar
          editor={editor}
          disabled={disabled}
          htmlMode={htmlMode}
          onToggleHtml={toggleHtml}
          onOpenDialog={setDialog}
        />
      ) : (
        <div className="h-10 border-b border-border bg-muted/50" />
      )}

      <div className="overflow-y-auto" style={maxHeight ? { maxHeight: toCss(maxHeight) } : undefined}>
        <div className={htmlMode ? "hidden" : undefined}>
          {editor ? (
            <EditorContent editor={editor} />
          ) : (
            <div style={{ minHeight: toCss(minHeight) }} />
          )}
        </div>
        {htmlMode && (
          <Textarea
            value={htmlDraft}
            onChange={(e) => handleHtmlChange(e.target.value)}
            spellCheck={false}
            aria-label="HTML source"
            disabled={disabled}
            className="block w-full resize-y rounded-none border-0 bg-background px-3 py-3 font-mono text-xs shadow-none focus-visible:ring-0"
            style={{ minHeight: toCss(minHeight) }}
          />
        )}
      </div>

      {editor && dialog === "link" && (
        <LinkDialog
          initialHref={(linkAttrs.href as string) ?? ""}
          initialNewTab={linkAttrs.target === "_blank"}
          isEditing={editor.isActive("link")}
          onSubmit={applyLink}
          onRemove={removeLink}
          onClose={closeDialog}
        />
      )}
      {editor && dialog === "image" && (
        <ImageDialog
          onUpload={onUploadImage}
          onClose={closeDialog}
          onSubmit={({ src, alt }) => {
            editor.chain().focus().setImage({ src, alt }).run();
            setDialog(null);
          }}
        />
      )}
      {editor && dialog === "video" && (
        <VideoDialog
          onClose={closeDialog}
          onSubmit={(attrs) => {
            // trailing paragraph so the cursor can continue below the video
            editor
              .chain()
              .focus()
              .insertContent([{ type: "video", attrs }, { type: "paragraph" }])
              .run();
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}