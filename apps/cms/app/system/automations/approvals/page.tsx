"use client";

import { useCallback, useEffect, useState } from "react";
import { IconBolt, IconCheck, IconPlayerPlay, IconRefresh, IconX } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/studio/page-state";

type ActionRequest = {
  id: string;
  action_type: string;
  title: string;
  description: string;
  risk_level: string;
  status: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  review_note: string;
  requested_at: string;
};

const dateLabel = (value: string) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function ApprovalQueuePage() {
  const [actions, setActions] = useState<ActionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/studio/assistant/actions", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Approval queue is unavailable.");
      setActions(payload.actions || []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Approval queue is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function decide(id: string, decision: "approve" | "reject" | "execute") {
    setBusy(`${id}:${decision}`);
    try {
      const response = await fetch("/api/studio/assistant/actions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, decision }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The action could not be updated.");
      if (decision === "approve") {
        const executeResponse = await fetch("/api/studio/assistant/actions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, decision: "execute" }) });
        const executePayload = await executeResponse.json();
        if (!executeResponse.ok) throw new Error(executePayload.error || "Approved action could not execute.");
        setActions((current) => current.map((item) => item.id === id ? executePayload.action : item));
      } else {
      setActions((current) => current.map((item) => item.id === id ? payload.action : item));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The action could not be updated.");
    } finally {
      setBusy(null);
    }
  }

  return <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight"><IconBolt className="size-7" />AI approval queue</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">AI can prepare actions, but nothing changes until an authorized operator approves and executes it.</p></div>
      <Button variant="outline" onClick={() => void load()} disabled={loading}><IconRefresh className={loading ? "animate-spin" : ""} />Refresh</Button>
    </header>
    {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
    <section className="grid gap-4 sm:grid-cols-3"><Card><CardHeader><CardDescription>Pending approval</CardDescription><CardTitle>{actions.filter((item) => item.status === "pending").length}</CardTitle></CardHeader></Card><Card><CardHeader><CardDescription>Approved</CardDescription><CardTitle>{actions.filter((item) => item.status === "approved").length}</CardTitle></CardHeader></Card><Card><CardHeader><CardDescription>Completed</CardDescription><CardTitle>{actions.filter((item) => item.status === "executed").length}</CardTitle></CardHeader></Card></section>
    <Card><CardHeader><CardTitle>Action requests</CardTitle><CardDescription>Review the proposed target, payload, risk and result before allowing execution.</CardDescription></CardHeader><CardContent className="space-y-3">{loading ? <PageState kind="loading" title="Loading approval requests" description="Fetching AI actions for your workspace." /> : !actions.length ? <PageState kind="empty" title="No AI actions" description="Approved AI actions will appear here for review." /> : actions.map((item) => <article key={item.id} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-medium">{item.title}</h2><Badge variant={item.status === "failed" ? "destructive" : item.status === "executed" ? "default" : "outline"} className="capitalize">{item.status}</Badge><Badge variant="secondary" className="capitalize">{item.risk_level} risk</Badge></div><p className="mt-1 text-sm text-muted-foreground">{item.description || item.action_type.replaceAll("_", " ")}</p><p className="mt-2 text-xs text-muted-foreground">Requested {dateLabel(item.requested_at)} · {item.action_type.replaceAll("_", " ")}</p></div><div className="flex flex-wrap gap-2">{item.status === "pending" && <><Button size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => void decide(item.id, "reject")}><IconX />Reject</Button><Button size="sm" disabled={Boolean(busy)} onClick={() => void decide(item.id, "approve")}><IconCheck />Approve</Button></>}{item.status === "approved" && <Button size="sm" disabled={Boolean(busy)} onClick={() => void decide(item.id, "execute")}><IconPlayerPlay />Execute</Button>}</div></div><pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">{JSON.stringify(item.payload, null, 2)}</pre>{item.result && Object.keys(item.result).length > 0 && <p className="mt-2 text-xs text-muted-foreground">Result: {JSON.stringify(item.result)}</p>}</article>)}</CardContent></Card>
  </main>;
}
