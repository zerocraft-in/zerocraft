"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IconMail,
  IconRefresh,
  IconRotateClockwise,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Event = {
  id: string;
  provider: string;
  kind: string;
  recipient: string;
  subject: string;
  status: string;
  attempts: number;
  message_id: string | null;
  last_error: string | null;
  next_attempt_at: string | null;
  sent_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export default function EmailEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [testStatus, setTestStatus] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/studio/email-events${status === "all" ? "" : `?status=${status}`}`,
        { cache: "no-store" },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Email events could not be loaded.");
      setEvents(payload.events || []);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Email events could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function retry(eventId: string) {
    setBusy(eventId);
    try {
      const response = await fetch("/api/studio/email-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Retry failed.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Retry failed.");
    } finally {
      setBusy(null);
    }
  }
  async function sendTestEmail() {
    setBusy("test");
    setTestStatus("");
    setError("");
    try {
      const response = await fetch("/api/studio/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Test email failed.");
      setTestStatus("Test email sent to your configured account.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Test email failed.");
    } finally {
      setBusy(null);
    }
  }
  const statusVariant = (value: string) =>
    value === "sent"
      ? "default"
      : value === "failed" || value === "dead_letter"
        ? "destructive"
        : "secondary";
  return (
    <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <IconMail className="size-7" />
            Delivery logs
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Monitor SMTP delivery, failed attempts, and manual retries for
            customer notifications.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => void sendTestEmail()}
            disabled={busy !== null}
          >
            Send test to my email
          </Button>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value || "all")}
          >
            <SelectTrigger className="w-36">
              <SelectValue>
                {status === "all" ? "All statuses" : status}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="dead_letter">Dead letter</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Refresh email logs"
          >
            <IconRefresh className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </header>
      {testStatus && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700"
        >
          {testStatus}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>SMTP delivery activity</CardTitle>
          <CardDescription>{events.length} events loaded</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="border-y bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Recipient</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Attempts</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3 font-medium">Error</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-5 py-4">
                      <strong className="block">{event.kind}</strong>
                      <span className="text-xs text-muted-foreground">
                        {event.subject}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs">{event.recipient}</td>
                    <td className="px-5 py-4">
                      <Badge variant={statusVariant(event.status)}>
                        {event.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 tabular-nums">{event.attempts}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-muted-foreground">
                      {dateLabel(event.created_at)}
                    </td>
                    <td className="max-w-[260px] truncate px-5 py-4 text-xs text-destructive">
                      {event.last_error || event.message_id || "—"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {event.status === "failed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void retry(event.id)}
                          disabled={busy === event.id}
                        >
                          <IconRotateClockwise
                            className={busy === event.id ? "animate-spin" : ""}
                          />
                          Retry
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && (
              <div className="p-6 text-sm text-muted-foreground">
                Loading email logs…
              </div>
            )}
            {!loading && !events.length && (
              <div className="grid min-h-48 place-items-center p-6 text-sm text-muted-foreground">
                No email delivery events yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
