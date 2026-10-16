"use client";

import { useState, type FormEvent } from "react";
import { IconCheck, IconClipboard, IconSparkles } from "@tabler/icons-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const taskOptions = [
  { value: "blog", label: "Blog outline" },
  { value: "project", label: "Project concept" },
  { value: "social", label: "Social captions" },
  { value: "product", label: "Product description" },
  { value: "reply", label: "Customer reply" },
];

export default function AiDraftPage() {
  const [task, setTask] = useState("blog");
  const [brief, setBrief] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  async function copyDraft() {
    try { await navigator.clipboard.writeText(draft); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
    catch { setError("Clipboard access was blocked. Select and copy the draft manually."); }
  }

  return <main className="mx-auto flex w-full max-w-screen-xl flex-col gap-6 pb-12">
    <header><p className="text-sm font-medium text-muted-foreground">Studio / Intelligence</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">AI studio</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Turn a verified brief into a first draft. Review every line before using it; nothing is published or sent automatically.</p></header>
    {error && <Alert variant="destructive"><AlertTitle>Drafting issue</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    <div className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><span className="rounded-lg bg-primary/10 p-2 text-primary"><IconSparkles size={18} /></span>Draft a new piece</CardTitle><CardDescription>Share only confirmed facts and a clear direction.</CardDescription></CardHeader><CardContent><form onSubmit={generate} className="space-y-5">
        <div className="space-y-2"><Label htmlFor="ai-task">Draft type</Label><Select value={task} onValueChange={(value) => value && setTask(value)}><SelectTrigger id="ai-task" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{taskOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="ai-brief">Facts and direction</Label><Textarea id="ai-brief" value={brief} onChange={(event) => setBrief(event.target.value)} required minLength={10} maxLength={3000} rows={9} placeholder="Describe the real topic, audience, tone, and confirmed details…" className="min-h-52 resize-y leading-relaxed" /><p className="text-right text-xs tabular-nums text-muted-foreground">{brief.length} / 3000</p></div>
        <Button type="submit" size="lg" disabled={busy || brief.trim().length < 10}>{busy ? "Creating draft…" : <><IconSparkles />Generate draft</>}</Button>
      </form></CardContent></Card>
      <Card><CardHeader><CardTitle>Editorial safeguards</CardTitle><CardDescription>Keep the content accurate and safe to use.</CardDescription></CardHeader><CardContent><ol className="space-y-4 text-sm">{["Use only facts you can verify.", "Avoid customer personal information.", "Check names, claims, and promises.", "Review the final text before publishing."].map((item, index) => <li key={item} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium tabular-nums">{index + 1}</span><span className="pt-0.5 text-muted-foreground">{item}</span></li>)}</ol><p className="mt-6 border-t pt-4 text-xs leading-relaxed text-muted-foreground">Requires server-side <code>GEMINI_API_KEY</code> and <code>GEMINI_MODEL</code>. Drafts remain in this page until you copy them.</p></CardContent></Card>
    </div>
    {draft && <Card><CardHeader className="flex-row items-center justify-between gap-3"><div><CardTitle>Editable draft</CardTitle><CardDescription>Make changes here before copying it into your workflow.</CardDescription></div><Button type="button" variant="outline" onClick={() => void copyDraft()}>{copied ? <IconCheck /> : <IconClipboard />}{copied ? "Copied" : "Copy text"}</Button></CardHeader><CardContent><Textarea aria-label="Editable draft output" value={draft} onChange={(event) => setDraft(event.target.value)} rows={17} className="min-h-80 resize-y leading-relaxed" /></CardContent></Card>}
  </main>;
}
