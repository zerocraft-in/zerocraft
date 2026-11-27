"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@zerocraft/components/ui/button";
import { Input } from "@zerocraft/components/ui/input";
import { Textarea } from "@zerocraft/components/ui/textarea";

type StorePage = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  updated_at: string;
};

export function StorePagesWorkspace() {
  const [pages, setPages] = useState<StorePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");

  const loadPages = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/content/pages", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Store pages could not be loaded.");
      setPages(payload.pages || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Store pages could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPages(); }, [loadPages]);

  async function createPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/content/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, content, status: "draft" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Page could not be created.");
      setTitle("");
      setSlug("");
      setContent("");
      setCreating(false);
      await loadPages();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Page could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Online Store</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Pages</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create and manage the pages published on your storefront.</p>
        </div>
        <Button onClick={() => setCreating((value) => !value)}>{creating ? "Cancel" : "Add page"}</Button>
      </header>

      {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

      {creating && (
        <form onSubmit={createPage} className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">Page title
            <Input required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="About us" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">URL handle
            <Input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="about-us" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Page content
            <Textarea value={content} onChange={(event) => setContent(event.target.value)} rows={6} placeholder="Write your page content" />
          </label>
          <div className="sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create draft page"}</Button></div>
        </form>
      )}

      <section className="overflow-hidden rounded-xl border bg-card">
        {loading ? <p className="p-6 text-sm text-muted-foreground">Loading pages…</p> : pages.length ? (
          <div className="divide-y">
            {pages.map((page) => (
              <article key={page.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-medium">{page.title}</h2>
                  <p className="mt-1 truncate text-xs text-muted-foreground">/{page.slug}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="capitalize">{page.status}</span>
                  <time dateTime={page.updated_at}>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(page.updated_at))}</time>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <h2 className="text-sm font-medium">No pages yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Create a draft page to start building your storefront.</p>
          </div>
        )}
      </section>
    </main>
  );
}
