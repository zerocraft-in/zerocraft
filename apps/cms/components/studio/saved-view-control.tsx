"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SavedView = { id: string; name: string; view_state: Record<string, unknown> };

export function SavedViewControl({ resource, workspace = "studio", state, onApply }: { resource: string; workspace?: string; state: Record<string, unknown>; onApply: (state: Record<string, unknown>) => void }) {
  const [views, setViews] = useState<SavedView[]>([]);
  const [selected, setSelected] = useState("");
  useEffect(() => { void fetch(`/api/studio/saved-views?workspace=${encodeURIComponent(workspace)}&resource=${encodeURIComponent(resource)}`, { cache: "no-store" }).then((response) => response.ok ? response.json() : { views: [] }).then((payload) => setViews(payload.views || [])).catch(() => undefined); }, [resource, workspace]);
  async function save() {
    const name = window.prompt("Saved view name");
    if (!name?.trim()) return;
    const response = await fetch("/api/studio/saved-views", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspace, resource, name: name.trim(), view_state: state }) });
    if (!response.ok) return;
    const payload = await response.json();
    setViews((current) => [payload.view, ...current.filter((view) => view.id !== payload.view.id)]);
    setSelected(payload.view.id);
  }
  async function remove() {
    if (!selected) return;
    await fetch("/api/studio/saved-views", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selected }) });
    setViews((current) => current.filter((view) => view.id !== selected));
    setSelected("");
  }
  return <div className="flex items-center gap-2"><Select value={selected} onValueChange={(value) => { const next = value || ""; setSelected(next); const view = views.find((item) => item.id === next); if (view) onApply(view.view_state); }}><SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Saved views" /></SelectTrigger><SelectContent>{views.map((view) => <SelectItem key={view.id} value={view.id}>{view.name}</SelectItem>)}</SelectContent></Select><Button type="button" variant="outline" size="sm" onClick={() => void save()}>Save view</Button>{selected && <Button type="button" variant="ghost" size="sm" onClick={() => void remove()}>Delete</Button>}</div>;
}
