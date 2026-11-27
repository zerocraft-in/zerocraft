"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  IconArrowDown,
  IconArrowLeft,
  IconArrowUp,
  IconChevronRight,
  IconDatabase,
  IconFileText,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { Button } from "@zerocraft/components/ui/button";
import { Input } from "@zerocraft/components/ui/input";
import { Textarea } from "@zerocraft/components/ui/textarea";
import { Badge } from "@zerocraft/components/ui/badge";
import { Checkbox } from "@zerocraft/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@zerocraft/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zerocraft/components/ui/table";
import {
  handleize,
  validateContent,
  type ContentKind,
  type ContentRecord,
  type MenuItem,
  type MetaField,
} from "@/lib/content-model";
import { FilesMediaManager } from "./files-media-manager";
import { MenusWorkspace } from "./menus-workspace";

const names: Record<ContentKind, string> = {
  folders: "Folders",
  menus: "Menus",
  redirects: "URL redirects",
  blogs: "Blogs",
  articles: "Blog posts",
  definitions: "Metaobjects",
  entries: "Entries",
};
const singular: Record<ContentKind, string> = {
  folders: "folder",
  menus: "menu",
  redirects: "redirect",
  blogs: "blog",
  articles: "blog post",
  definitions: "definition",
  entries: "entry",
};
const panel = "rounded-xl border border-border bg-card shadow-sm";
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-xs font-medium">
      {label}
      {children}
    </label>
  );
}
function Picker({
  value,
  onChange,
  children,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </select>
  );
}
const empty = (kind: ContentKind, parent: string | null): ContentRecord => ({
  id: "",
  kind,
  title: "",
  handle: "",
  status: "draft",
  parent_id: parent,
  data:
    kind === "menus"
      ? { items: [] }
      : kind === "definitions"
        ? { fields: [], storefront: false, webPage: false }
        : kind === "entries"
          ? { values: {} }
          : kind === "articles"
            ? {
                content: "",
                author: "",
                excerpt: "",
                tags: "",
                seoTitle: "",
                seoDescription: "",
              }
            : {},
  updated_at: "",
});

export function ContentWorkspace({
  initialKind,
}: {
  initialKind: ContentKind;
}) {
  const [manageMode, setManageMode] = useState(false);
  const [kind, setKind] = useState(initialKind);
  const [records, setRecords] = useState<ContentRecord[]>([]);
  const [groups, setGroups] = useState<ContentRecord[]>([]);
  const [entries, setEntries] = useState<ContentRecord[]>([]);
  const [parent, setParent] = useState<ContentRecord | null>(null);
  const [draft, setDraft] = useState<ContentRecord | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<ContentRecord | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function get(type: ContentKind) {
      const response = await fetch(`/api/store/content/${type}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Content could not be loaded.");
      return payload.records as ContentRecord[];
    }
    setLoading(true);
    setError("");
    void Promise.all([
      get(kind),
      kind === "articles" ? get("blogs") : Promise.resolve([]),
      kind === "definitions" || kind === "entries"
        ? get("entries")
        : Promise.resolve([]),
    ])
      .then(([items, blogs, allEntries]) => {
        if (!controller.signal.aborted) {
          setRecords(items);
          setGroups(blogs);
          setEntries(allEntries);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [kind, revision]);
  function navigate(next: ContentKind, group: ContentRecord | null = null) {
    setKind(next);
    setParent(group);
    setRecords([]);
    setSearch("");
    setStatus("all");
    setError("");
    setNotice("");
  }
  function create() {
    const next = empty(kind, parent?.id || groups[0]?.id || null);
    setDraft(next);
    setError("");
  }
  function update(key: keyof ContentRecord, value: unknown) {
    setDraft((current) => current && { ...current, [key]: value });
  }
  function data(key: string, value: unknown) {
    setDraft(
      (current) =>
        current && { ...current, data: { ...current.data, [key]: value } },
    );
  }
  async function mutate(method: string, record: ContentRecord) {
    if (method !== "DELETE") {
      const invalid = validateContent(kind, record);
      if (invalid) {
        setError(invalid);
        return;
      }
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/store/content/${kind}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Changes could not be saved.");
      setDraft(null);
      setDeleting(null);
      setNotice(method === "DELETE" ? "Content deleted." : "Changes saved.");
      setRevision((value) => value + 1);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Changes could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }
  const visible = records.filter(
    (record) =>
      (!parent || record.parent_id === parent.id) &&
      (status === "all" || record.status === status) &&
      `${record.title} ${record.handle}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const fields = (draft?.data.fields || []) as MetaField[];
  const items = (draft?.data.items || []) as MenuItem[];
  function move(index: number, offset: number) {
    const next = [...items];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    data("items", next);
  }
  return (
    <section
      className={`space-y-3 text-sm [&_[data-slot=button]]:rounded-lg ${kind === "articles" && !records.length ? "mx-auto max-w-5xl" : ""}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 py-1">
        <div className="flex items-center gap-2">
          {kind !== initialKind && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Back"
              onClick={() => navigate(initialKind)}
            >
              <IconArrowLeft />
            </Button>
          )}
          {kind === "definitions" ? (
            <IconDatabase className="size-4" />
          ) : (
            <IconFileText className="size-4" />
          )}
          <h1 className="text-base font-semibold">
            {parent ? parent.title : names[kind]}
          </h1>
        </div>
        <div className="flex gap-2">
          {kind === "menus" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("redirects")}
            >
              URL redirects
            </Button>
          )}
          {kind === "articles" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("blogs")}
            >
              Manage blogs
            </Button>
          )}
          {kind === "definitions" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatus("all");
                setManageMode((value) => !value);
              }}
            >
              {manageMode ? "Done" : "Manage"}
            </Button>
          )}
          <Button
            size="sm"
            onClick={create}
            disabled={loading || (kind === "articles" && !groups.length)}
          >
            <IconPlus className="size-3.5" />
            {kind === "definitions"
              ? "Add definition"
              : `Create ${singular[kind]}`}
          </Button>
        </div>
      </header>
      {error && !draft && !deleting && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive"
        >
          {error}
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setRevision((value) => value + 1)}
          >
            Retry
          </Button>
        </div>
      )}
      {notice && (
        <p role="status" className="rounded-lg border bg-muted/40 p-3 text-xs">
          {notice}
        </p>
      )}
      {kind === "definitions" && (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-3">
            {[
              [
                "Available on storefront",
                entries.filter((entry) =>
                  records.some(
                    (definition) =>
                      definition.id === entry.parent_id &&
                      definition.data.storefront,
                  ),
                ).length,
              ],
              [
                "Web pages",
                entries.filter((entry) =>
                  records.some(
                    (definition) =>
                      definition.id === entry.parent_id &&
                      definition.data.webPage,
                  ),
                ).length,
              ],
              [
                "Active",
                entries.filter((entry) => entry.status === "active").length,
              ],
              [
                "Draft",
                entries.filter((entry) => entry.status === "draft").length,
              ],
            ].map(([label, count]) => (
              <div key={label} className={`${panel} min-h-24 p-4`}>
                <p className="text-xs font-medium">{label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {loading ? "…" : `${count} entries`}
                </p>
                <span className="mt-3 block size-6 rounded-full border bg-amber-100" />
              </div>
            ))}
          </div>
          <div className={`${panel} p-4`}>
            <h2 className="text-xs font-medium">Recent entries</h2>
            {entries.slice(0, 3).map((entry) => (
              <button
                key={entry.id}
                onClick={() => {
                  const definition = records.find(
                    (row) => row.id === entry.parent_id,
                  );
                  if (definition) navigate("entries", definition);
                }}
                className="mt-4 flex w-full justify-between text-left text-xs"
              >
                <span>{entry.title}</span>
                <span className="text-muted-foreground">
                  {records.find((row) => row.id === entry.parent_id)?.title}
                </span>
              </button>
            ))}
            {!entries.length && (
              <p className="mt-5 text-xs text-muted-foreground">
                Your recent entries will appear here.
              </p>
            )}
          </div>
        </div>
      )}
      {(records.length > 0 || kind !== "articles") && (
        <div className={`${panel} flex items-center gap-3 p-2`}>
          <div className="w-28">
            <Picker label="Filter status" value={status} onChange={setStatus}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </Picker>
          </div>
          <IconSearch className="size-4 text-muted-foreground" />
          <Input
            aria-label={`Search ${names[kind]}`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              kind === "definitions"
                ? "Searching in metaobject definitions…"
                : "Search and filter"
            }
            className="h-8 border-0 bg-transparent shadow-none"
          />
        </div>
      )}
      {loading ? (
        <div role="status" className="p-16 text-center text-muted-foreground">
          Loading {names[kind].toLowerCase()}…
        </div>
      ) : visible.length ? (
        <div className={`${panel} overflow-hidden`}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>{kind === "menus" ? "Menu" : "Title"}</TableHead>
                <TableHead>
                  {kind === "menus"
                    ? "Menu items"
                    : kind === "definitions"
                      ? "Entries"
                      : kind === "redirects"
                        ? "Redirect to"
                        : "Status"}
                </TableHead>
                <TableHead className="w-32">Updated</TableHead>
                <TableHead className="w-20">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <button
                      className="text-left font-medium hover:underline"
                      onClick={() => {
                        if (kind === "definitions") navigate("entries", record);
                        else {
                          setDraft(record);
                          setError("");
                        }
                      }}
                    >
                      {record.title}
                    </button>
                    {kind === "redirects" && (
                      <p className="text-xs text-muted-foreground">
                        {String(record.data.from || "")}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {kind === "menus" ? (
                      (record.data.items as MenuItem[])
                        .map((item) => item.label)
                        .join(", ") || "No items"
                    ) : kind === "definitions" ? (
                      entries.filter((entry) => entry.parent_id === record.id)
                        .length
                    ) : kind === "redirects" ? (
                      String(record.data.to || "")
                    ) : (
                      <Badge variant="secondary">
                        {record.status === "active"
                          ? kind === "articles"
                            ? "Published"
                            : "Active"
                          : "Draft"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(record.updated_at).toLocaleDateString("en-IN")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {kind === "definitions" && manageMode && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setDraft(record)}
                        >
                          Edit
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Delete ${record.title}`}
                        onClick={() => {
                          setDeleting(record);
                          setError("");
                        }}
                      >
                        <IconTrash className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        !error && (
          <div
            className={
              kind === "articles"
                ? `${panel} flex min-h-[450px] flex-col items-center justify-center px-6 text-center`
                : "flex min-h-56 flex-col items-center justify-center px-6 text-center"
            }
          >
            {kind === "articles" && (
              <div className="mb-7 grid size-28 place-items-center rounded-full bg-muted">
                <IconFileText
                  className="size-16 text-muted-foreground"
                  stroke={1}
                />
              </div>
            )}
            <h2 className="text-base font-semibold">
              {search || status !== "all"
                ? "No results found"
                : kind === "articles"
                  ? "Write a blog post"
                  : kind === "definitions"
                    ? "No definitions found"
                    : `No ${names[kind].toLowerCase()} yet`}
            </h2>
            <p className="mt-2 max-w-md text-xs leading-5 text-muted-foreground">
              {search || status !== "all"
                ? "Try changing the filters or search term."
                : kind === "articles"
                  ? "Blog posts are a great way to build a community around your products and your brand."
                  : `Create your first ${singular[kind]} to get started.`}
            </p>
            <Button
              className="mt-5"
              size="sm"
              onClick={
                kind === "articles" && !groups.length
                  ? () => navigate("blogs")
                  : create
              }
            >
              {kind === "articles" && !groups.length
                ? "Create a blog first"
                : `Create ${singular[kind]}`}
            </Button>
          </div>
        )
      )}
      <Dialog
        open={Boolean(draft)}
        onOpenChange={(open) => {
          if (!open && !saving) setDraft(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl [&_[data-slot=button]]:rounded-lg">
          <DialogHeader>
            <DialogTitle>
              {draft?.id ? "Edit" : "Create"} {singular[kind]}
            </DialogTitle>
            <DialogDescription>
              {kind === "menus"
                ? "Arrange your navigation links. Indent items to create up to three levels."
                : kind === "definitions"
                  ? "Define reusable structured content and its fields."
                  : "Add your content details and save your changes."}
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <form
              id="content-editor"
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                void mutate(draft.id ? "PATCH" : "POST", draft);
              }}
            >
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title">
                  <Input
                    required
                    maxLength={200}
                    value={draft.title}
                    onChange={(event) => {
                      const title = event.target.value;
                      setDraft(
                        (current) =>
                          current && {
                            ...current,
                            title,
                            handle:
                              current.handle === handleize(current.title)
                                ? handleize(title)
                                : current.handle,
                          },
                      );
                    }}
                  />
                </Field>
                <Field label="Handle">
                  <Input
                    required
                    maxLength={120}
                    value={draft.handle}
                    onChange={(event) => update("handle", event.target.value)}
                  />
                </Field>
              </div>
              <Field label="Status">
                <Picker
                  label="Status"
                  value={draft.status}
                  onChange={(value) => update("status", value)}
                >
                  <option value="draft">Draft</option>
                  <option value="active">
                    {kind === "articles" ? "Published" : "Active"}
                  </option>
                </Picker>
              </Field>
              {kind === "redirects" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Redirect from">
                    <Input
                      required
                      placeholder="/old-page"
                      value={String(draft.data.from || "")}
                      onChange={(event) => data("from", event.target.value)}
                    />
                  </Field>
                  <Field label="Redirect to">
                    <Input
                      required
                      placeholder="/new-page or https://…"
                      value={String(draft.data.to || "")}
                      onChange={(event) => data("to", event.target.value)}
                    />
                  </Field>
                </div>
              )}
              {kind === "menus" && (
                <div className="space-y-3">
                  <h3 className="font-medium">Menu items</h3>
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border p-3"
                      style={{ marginLeft: item.depth * 16 }}
                    >
                      <Input
                        aria-label={`Item ${index + 1} label`}
                        className="min-w-24 flex-1"
                        placeholder="Label"
                        value={item.label}
                        onChange={(event) =>
                          data(
                            "items",
                            items.map((row, i) =>
                              i === index
                                ? { ...row, label: event.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                      <Input
                        aria-label={`Item ${index + 1} link`}
                        className="min-w-32 flex-1"
                        placeholder="/collections/all"
                        value={item.url}
                        onChange={(event) =>
                          data(
                            "items",
                            items.map((row, i) =>
                              i === index
                                ? { ...row, url: event.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          disabled={index === 0}
                          aria-label="Move item up"
                          onClick={() => move(index, -1)}
                        >
                          <IconArrowUp />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          disabled={index === items.length - 1}
                          aria-label="Move item down"
                          onClick={() => move(index, 1)}
                        >
                          <IconArrowDown />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Change nesting level"
                          onClick={() =>
                            data(
                              "items",
                              items.map((row, i) =>
                                i === index
                                  ? { ...row, depth: (row.depth + 1) % 3 }
                                  : row,
                              ),
                            )
                          }
                        >
                          <IconChevronRight />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Remove item"
                          onClick={() =>
                            data(
                              "items",
                              items.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <IconTrash />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      data("items", [
                        ...items,
                        {
                          id: crypto.randomUUID(),
                          label: "",
                          url: "",
                          depth: 0,
                        },
                      ])
                    }
                  >
                    <IconPlus />
                    Add menu item
                  </Button>
                </div>
              )}
              {kind === "definitions" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-5">
                    {[
                      ["storefront", "Available on storefront"],
                      ["webPage", "Publish as web pages"],
                    ].map(([key, label]) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 text-xs"
                      >
                        <Checkbox
                          checked={Boolean(draft.data[key])}
                          onCheckedChange={(checked) =>
                            data(key, checked === true)
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <h3 className="font-medium">Fields</h3>
                  {fields.map((field, index) => (
                    <div
                      key={index}
                      className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_110px_auto_auto]"
                    >
                      <Input
                        aria-label="Field name"
                        placeholder="Name"
                        value={field.name}
                        onChange={(event) =>
                          data(
                            "fields",
                            fields.map((row, i) =>
                              i === index
                                ? { ...row, name: event.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                      <Input
                        aria-label="Field key"
                        placeholder="field_key"
                        value={field.key}
                        onChange={(event) =>
                          data(
                            "fields",
                            fields.map((row, i) =>
                              i === index
                                ? { ...row, key: event.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                      <Picker
                        label="Field type"
                        value={field.type}
                        onChange={(value) =>
                          data(
                            "fields",
                            fields.map((row, i) =>
                              i === index ? { ...row, type: value } : row,
                            ),
                          )
                        }
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                      </Picker>
                      <label className="flex items-center gap-1 text-xs">
                        <Checkbox
                          checked={field.required}
                          onCheckedChange={(value) =>
                            data(
                              "fields",
                              fields.map((row, i) =>
                                i === index
                                  ? { ...row, required: value === true }
                                  : row,
                              ),
                            )
                          }
                        />
                        Required
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove field"
                        onClick={() =>
                          data(
                            "fields",
                            fields.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <IconTrash />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      data("fields", [
                        ...fields,
                        { name: "", key: "", type: "text", required: false },
                      ])
                    }
                  >
                    Add field
                  </Button>
                </div>
              )}
              {kind === "entries" &&
                ((parent?.data.fields || []) as MetaField[]).map((field) => {
                  const values = (draft.data.values || {}) as Record<
                    string,
                    unknown
                  >;
                  return (
                    <Field
                      key={field.key}
                      label={field.name + (field.required ? " *" : "")}
                    >
                      {field.type === "boolean" ? (
                        <Picker
                          label={field.name}
                          value={
                            values[field.key] === undefined
                              ? ""
                              : String(values[field.key])
                          }
                          onChange={(value) =>
                            data("values", {
                              ...values,
                              [field.key]:
                                value === "" ? null : value === "true",
                            })
                          }
                        >
                          <option value="">Choose…</option>
                          <option value="true">True</option>
                          <option value="false">False</option>
                        </Picker>
                      ) : (
                        <Input
                          required={field.required}
                          type={field.type === "number" ? "number" : "text"}
                          step="any"
                          value={String(values[field.key] ?? "")}
                          onChange={(event) =>
                            data("values", {
                              ...values,
                              [field.key]:
                                field.type === "number" &&
                                event.target.value !== ""
                                  ? Number(event.target.value)
                                  : event.target.value,
                            })
                          }
                        />
                      )}
                    </Field>
                  );
                })}
              {kind === "articles" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Blog">
                      <Picker
                        label="Blog"
                        value={draft.parent_id || ""}
                        onChange={(value) => update("parent_id", value)}
                      >
                        {groups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.title}
                          </option>
                        ))}
                      </Picker>
                    </Field>
                    <Field label="Author">
                      <Input
                        value={String(draft.data.author || "")}
                        onChange={(event) => data("author", event.target.value)}
                      />
                    </Field>
                  </div>
                  <Field label="Content">
                    <Textarea
                      className="min-h-56"
                      value={String(draft.data.content || "")}
                      onChange={(event) => data("content", event.target.value)}
                    />
                  </Field>
                  {[
                    ["excerpt", "Excerpt"],
                    ["tags", "Tags (comma separated)"],
                    ["seoTitle", "Search engine title"],
                    ["seoDescription", "Search engine description"],
                  ].map(([key, label]) => (
                    <Field key={key} label={label}>
                      <Input
                        value={String(draft.data[key] || "")}
                        onChange={(event) => data(key, event.target.value)}
                      />
                    </Field>
                  ))}
                </>
              )}
            </form>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => setDraft(null)}
            >
              Cancel
            </Button>
            <Button type="submit" form="content-editor" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open && !saving) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleting?.title}?</DialogTitle>
            <DialogDescription>
              This permanently deletes this {singular[kind]}. Groups containing
              posts or entries must be emptied first.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => setDeleting(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={saving}
              onClick={() => deleting && void mutate("DELETE", deleting)}
            >
              {saving ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
export function MetaobjectsPage() {
  return <ContentWorkspace initialKind="definitions" />;
}
export function MenusPage() {
  return <MenusWorkspace mode="list" />;
}
export function BlogPostsPage() {
  return <ContentWorkspace initialKind="articles" />;
}
export function FilesPage() {
  return <FilesMediaManager />;
}
