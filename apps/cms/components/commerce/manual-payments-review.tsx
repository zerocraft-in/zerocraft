"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { Alert, AlertDescription, AlertTitle } from "@zerocraft/components/ui/alert";
import { Badge } from "@zerocraft/components/ui/badge";
import { Button } from "@zerocraft/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@zerocraft/components/ui/card";
import { Textarea } from "@zerocraft/components/ui/textarea";

type Submission = { id: string; order_id: string; payment_attempt_id: string; utr: string; amount: number; status: "pending" | "approved" | "rejected"; created_at: string; note: string; review_note: string };

export function ManualPaymentsReview() {
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: isAdmin }, { data, error: readError }] = await Promise.all([
      supabase.rpc("is_admin"),
      supabase.from("payment_submissions").select("id,order_id,payment_attempt_id,utr,amount,status,created_at,note,review_note").order("created_at", { ascending: false }),
    ]);
    setAdmin(Boolean(isAdmin)); setRows((data ?? []) as Submission[]); setError(readError ? "Payment submissions could not be loaded. Apply the manual payment migration first." : ""); setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function review(id: string, decision: "approve" | "reject") {
    setBusy(id); setError("");
    const { error: reviewError } = await supabase.rpc("verify_manual_payment", { p_submission_id: id, p_decision: decision, p_note: notes[id] ?? "" });
    if (reviewError) setError(reviewError.message.includes("PAYMENT_FORBIDDEN") ? "Only a studio admin can verify manual payments." : "The payment review could not be saved.");
    else setRows((current) => current.map((row) => row.id === id ? { ...row, status: decision === "approve" ? "approved" : "rejected", review_note: notes[id] ?? "" } : row));
    setBusy("");
  }
  return <main className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-screen-2xl flex-col gap-6 pb-12"><header><h1 className="text-3xl font-semibold tracking-tight">Manual payments</h1><p className="mt-2 text-sm text-muted-foreground">Review UTR submissions separately from order fulfillment. Nothing is auto-confirmed.</p></header>{error && <Alert variant="destructive"><AlertTitle>Payment review needs attention</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}{!admin && !loading && <Alert><AlertTitle>Read-only access</AlertTitle><AlertDescription>Only studio admins can approve or reject payment proof.</AlertDescription></Alert>}<Card><CardHeader><CardTitle>Payment proof queue</CardTitle><CardDescription>{loading ? "Loading…" : `${rows.length} submissions`}</CardDescription></CardHeader><CardContent className="grid gap-3">{!loading && !rows.length && <p className="text-sm text-muted-foreground">No payment proofs have been submitted.</p>}{rows.map((row) => <article key={row.id} className="grid gap-3 rounded-lg border p-4 lg:grid-cols-[1fr_auto]"><div className="grid gap-1 text-sm"><div className="flex flex-wrap items-center gap-2"><strong>UTR {row.utr}</strong><Badge variant={row.status === "approved" ? "default" : row.status === "rejected" ? "destructive" : "secondary"}>{row.status}</Badge></div><span className="text-muted-foreground">Order {row.order_id} · ₹{Number(row.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })} · {new Date(row.created_at).toLocaleString("en-IN")}</span>{row.note && <span className="text-muted-foreground">Customer note: {row.note}</span>}</div>{row.status === "pending" && <div className="flex min-w-64 flex-col gap-2"><Textarea value={notes[row.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [row.id]: event.target.value }))} placeholder="Review note (optional)" maxLength={500} disabled={!admin || busy === row.id} /><div className="flex gap-2"><Button size="sm" disabled={!admin || Boolean(busy)} onClick={() => void review(row.id, "approve")}>Approve payment</Button><Button size="sm" variant="outline" disabled={!admin || Boolean(busy)} onClick={() => void review(row.id, "reject")}>Reject</Button></div></div>}</article>)}</CardContent></Card></main>;
}
