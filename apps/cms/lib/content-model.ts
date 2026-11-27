export const contentKinds = ["folders", "menus", "redirects", "blogs", "articles", "definitions", "entries"] as const;
export type ContentKind = typeof contentKinds[number];
export type ContentRecord = { id: string; kind: ContentKind; title: string; handle: string; status: "draft" | "active"; parent_id: string | null; data: Record<string, unknown>; updated_at: string };
export type MenuItem = { id: string; label: string; url: string; depth: number; tags?: string };
export type MetaField = { key: string; name: string; type: "text" | "number" | "boolean"; required: boolean };
export const handleize = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export function validLink(value: string) { return /^\/(?!\/)[^\s\\]*$/.test(value) || /^https?:\/\/[^\s]+$/.test(value) || /^(mailto:|tel:)[^\s]+$/.test(value); }
export function validateContent(kind: ContentKind, body: Record<string, unknown>): string | null {
  if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 200) return "Enter a title of 1–200 characters.";
  if (typeof body.handle !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.handle) || body.handle.length > 120) return "Enter a unique handle using lowercase letters, numbers, and hyphens.";
  if (body.status !== "draft" && body.status !== "active") return "Choose a valid status.";
  if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) return "Content details are required.";
  const data = body.data as Record<string, unknown>;
  if (JSON.stringify(data).length > 100000) return "Content is too large (maximum 100 KB).";
  if (kind === "menus") {
    if (!Array.isArray(data.items) || data.items.length > 100) return "A menu supports up to 100 items.";
    let previous = 0;
    for (const [index, item] of (data.items as MenuItem[]).entries()) {
      if (!item || typeof item.label !== "string" || !item.label.trim() || typeof item.url !== "string" || !validLink(item.url)) return "Each menu item needs a label and a valid link.";
      if (!Number.isInteger(item.depth) || item.depth < 0 || item.depth > 2 || (index === 0 && item.depth !== 0) || item.depth > previous + 1) return "Menu nesting must start at the top level and cannot skip a level.";
      if (item.tags !== undefined && (typeof item.tags !== "string" || item.tags.length > 500)) return "Collection tag filters must be 500 characters or fewer.";
      previous = item.depth;
    }
  }
  if (kind === "redirects" && (typeof data.from !== "string" || !/^\/(?!\/)[^\s?#\\]*$/.test(data.from) || typeof data.to !== "string" || !validLink(data.to) || data.from === data.to)) return "Use a source path and a different valid destination.";
  if (kind === "definitions") {
    if (!Array.isArray(data.fields) || !data.fields.length || data.fields.length > 40) return "Add 1–40 fields.";
    const keys = new Set<string>();
    for (const field of data.fields as MetaField[]) {
      if (!field || typeof field.key !== "string" || !/^[a-z][a-z0-9_]*$/.test(field.key) || (typeof field.name !== "string" || !field.name.trim()) || !["text", "number", "boolean"].includes(field.type) || typeof field.required !== "boolean" || keys.has(field.key)) return "Fields need unique keys, names, and valid types.";
      keys.add(field.key);
    }
  }
  if ((kind === "articles" || kind === "entries") && (typeof body.parent_id !== "string" || !body.parent_id)) return kind === "articles" ? "Choose a blog first." : "Choose a definition first.";
  if (kind === "articles" && (typeof data.content !== "string" || typeof data.author !== "string")) return "Article content and author must be text.";
  return null;
}
