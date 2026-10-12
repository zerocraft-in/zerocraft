"use client";

import { useState, type FormEvent } from "react";

export default function AiDraftPage() {
  const [task, setTask] = useState("blog");
  const [brief, setBrief] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(null); setDraft("");
    try {
      const response = await fetch("/api/studio/ai-draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task, brief }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Drafting failed.");
      setDraft(result.draft);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Drafting failed."); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-5xl space-y-7 pb-12"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Studio / Intelligence</p><h1 className="mt-2 text-4xl font-semibold tracking-[-.06em]">AI studio<span className="text-[#a5ce00]">.</span></h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">A Gemini-powered drafting desk for content and operations. Add a factual brief, review every line, then copy the result into your workflow. Nothing is published or sent automatically.</p></div><div className="grid gap-4 lg:grid-cols-[1fr_.75fr]"><form onSubmit={generate} className="space-y-5 rounded-2xl border border-border bg-card p-6"><div><label className="block text-sm font-semibold" htmlFor="ai-task">What are we drafting?</label><select id="ai-task" value={task} onChange={(event) => setTask(event.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm"><option value="blog">Blog outline</option><option value="project">Project concept description</option><option value="social">Social captions</option><option value="product">Product description</option><option value="reply">Customer reply</option></select></div><div><label className="block text-sm font-semibold" htmlFor="ai-brief">Verified facts & direction</label><textarea id="ai-brief" value={brief} onChange={(event) => setBrief(event.target.value)} required minLength={10} maxLength={3000} rows={9} placeholder="Describe the real topic, audience, tone, and confirmed details…" className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm leading-relaxed" /><p className="mt-1 text-right font-mono text-[10px] text-muted-foreground">{brief.length} / 3000</p></div><button type="submit" disabled={busy} className="rounded-lg bg-[#c8fb00] px-5 py-3 text-sm font-semibold text-black disabled:opacity-60">{busy ? "Drafting…" : "Generate draft ↗"}</button>{error && <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}</form><aside className="rounded-2xl border border-border bg-card p-6"><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Editorial safeguards</p><h2 className="mt-3 text-xl font-semibold">Your facts stay in control.</h2><ul className="mt-5 space-y-4 text-sm text-muted-foreground"><li>01 / Drafts use only the facts you provide.</li><li>02 / Unknown client names, results, and promises stay unclaimed.</li><li>03 / Review text before publishing or sending.</li><li>04 / Do not put customer personal data in the brief.</li></ul><p className="mt-7 border-t border-border pt-5 text-xs text-muted-foreground">Requires server-side GEMINI_API_KEY and GEMINI_MODEL. Provider availability and free-tier quota depend on the Google AI Studio account.</p></aside></div>{draft && <section className="space-y-3 rounded-2xl border border-border bg-card p-6"><div className="flex flex-wrap items-center justify-between gap-3"><label htmlFor="ai-output" className="text-lg font-semibold">Editable draft</label><button type="button" onClick={() => void navigator.clipboard.writeText(draft)} className="rounded-lg border border-border px-4 py-2 text-xs font-semibold hover:bg-muted">Copy text</button></div><textarea id="ai-output" value={draft} onChange={(event) => setDraft(event.target.value)} rows={17} className="w-full rounded-lg border border-border bg-background p-4 text-sm leading-relaxed" /></section>}</main>;
}
