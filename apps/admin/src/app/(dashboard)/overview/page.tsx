"use client";

import * as React from "react";
import { motion } from "framer-motion";
import Link from "next/link";

import { Button } from "@zerocraft/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@zerocraft/ui/card";
import { toast } from "@zerocraft/ui/toast";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { getSetupStatus } from "@/app/(auth)/onboarding/actions";

type Kpi = {
  label: string;
  value: string;
  note: string;
  accent: "primary" | "tag";
};

const kpis: Kpi[] = [
  {
    label: "Stock on hand",
    value: "1,248",
    note: "units across all locations",
    accent: "primary",
  },
  {
    label: "Today's sales",
    value: "₹84,320",
    note: "versus yesterday",
    accent: "primary",
  },
  {
    label: "Low stock",
    value: "12",
    note: "items need reordering",
    accent: "tag",
  },
];

type Task = {
  id: string;
  label: string;
  hint: string;
};

const tasks: Task[] = [
  {
    id: "receive",
    label: "Receive new spring stock",
    hint: "Shop — three boxes awaiting unpacking",
  },
  {
    id: "tag",
    label: "Tag summer tees S–XL",
    hint: "Size stickers on the cutting table",
  },
  {
    id: "reconcile",
    label: "Reconcile yesterday's takings",
    hint: "Shop, online, and van",
  },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const isTag = kpi.accent === "tag";
  return (
    <Card
      className="flex-1 flex flex-col border-l-4"
      style={{
        borderLeftColor: isTag ? "var(--tag)" : "var(--primary)",
      }}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1">
        <CardTitle
          className="text-[12px] font-medium leading-tight"
          style={{
            color: isTag ? "var(--tag)" : "var(--primary)",
          }}
        >
          {kpi.label}
        </CardTitle>
        <CardTitle className="text-[26px] font-semibold leading-tight">
          {kpi.value}
        </CardTitle>
      </CardHeader>
      <CardDescription className="mt-0.5 text-[12px]">
        {kpi.note}
      </CardDescription>
    </Card>
  );
}

function TaskRow({ task }: { task: Task }) {
  const [done, setDone] = React.useState(false);
  return (
    <label
      className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50"
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        onClick={() => setDone((d) => !d)}
        className="shrink-0 flex size-5 items-center justify-center rounded-sm border border-border text-sm transition-colors disabled:opacity-50"
        style={{
          borderColor: done ? "var(--primary)" : "var(--border)",
          color: done ? "var(--primary-foreground)" : "var(--muted-foreground)",
          background: done ? "var(--primary)" : "transparent",
        }}
      >
        {done && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="m4.5 6 1.5 1.5L8 3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
      <div className="min-w-0 flex flex-col gap-0.5">
        <span className="text-[13px] font-medium leading-snug" style={{ color: "var(--foreground)" }}>
          {task.label}
        </span>
        <span className="text-[11px] leading-tight" style={{ color: "var(--muted-foreground)" }}>
          {task.hint}
        </span>
      </div>
    </label>
  );
}

// Client-side cache for getSetupStatus to prevent redundant fetches during
// React Strict Mode double-invocation or HMR remounts.
const setupStatusClientCache = new Map<string, { data: any; timestamp: number }>();
const CLIENT_CACHE_TTL_MS = 10_000;

function SetupCard() {
  const [status, setStatus] = React.useState<{
    complete: boolean;
    storeId: string | null;
    jobId: string | null;
    jobStatus: string | null;
    jobProgress: number;
    setupUrl: string;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    // Check client cache first
    const cacheKey = "setup-status";
    const cached = setupStatusClientCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL_MS) {
      const result = cached.data;
      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }
      setStatus({
        complete: result.complete,
        storeId: result.storeId,
        jobId: result.jobId,
        jobStatus: result.jobStatus,
        jobProgress: result.jobProgress,
        setupUrl: result.setupUrl,
      });
      setLoading(false);
      return;
    }

    getSetupStatus()
      .then((result) => {
        if (cancelled) return;
        // Cache successful responses
        if (result.ok) {
          setupStatusClientCache.set(cacheKey, { data: result, timestamp: Date.now() });
        }
        if (!result.ok) {
          setError(result.error);
          setLoading(false);
          return;
        }
        setStatus({
          complete: result.complete,
          storeId: result.storeId,
          jobId: result.jobId,
          jobStatus: result.jobStatus,
          jobProgress: result.jobProgress,
          setupUrl: result.setupUrl,
        });
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Unable to load setup status.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card className="flex flex-col gap-3">
        <CardHeader>
          <CardTitle className="text-[13px] font-medium">Store setup</CardTitle>
          <CardDescription className="text-[11px]">Completing your onboarding…</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2 pt-1">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-[12px] text-muted-foreground">Checking setup status</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return null;
  }

  if (!status) return null;

  // Setup complete — show a small success badge only.
  if (status.complete) {
    return (
      <Card className="flex items-center gap-3 border-l-4 border-success px-3 py-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success/10 text-success-fg">
          <CheckCircle2 size={16} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex flex-col">
          <span className="text-[12px] font-medium leading-snug" style={{ color: "var(--foreground)" }}>
            Store setup complete
          </span>
          <span className="text-[11px] leading-tight" style={{ color: "var(--success)" }}>
            Your commerce project is active.
          </span>
        </div>
      </Card>
    );
  }

  // Setup incomplete — show an action card.
  return (
    <Card className="flex items-center gap-3 border-l-4 border-accent px-3 py-2">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent-foreground">
        <AlertCircle size={16} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex flex-col">
        <span className="text-[12px] font-medium leading-snug" style={{ color: "var(--foreground)" }}>
          Complete your store setup
        </span>
        <span className="text-[11px] leading-tight" style={{ color: "var(--muted-foreground)" }}>
          {status.jobStatus ? `${status.jobStatus.charAt(0).toUpperCase() + status.jobStatus.slice(1)} (${status.jobProgress}%)` : "Your commerce project hasn't been provisioned yet."}
        </span>
      </div>
      <Link href={status.setupUrl}>
        <Button size="sm" className="text-[11px] px-2 py-1.5">
          Finish setup
        </Button>
      </Link>
    </Card>
  );
}

export default function OverviewPage() {
  return (
    <main
      className="flex min-h-full flex-col font-manrope"
      style={{ background: "var(--background)" }}
    >
      {/* Single orchestrated motion moment: one page-load fade-in. */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col px-6 py-6"
      >
        <header className="pb-6">
          <p className="text-[12px] font-medium leading-tight" style={{ color: "var(--muted-foreground)" }}>
            {greeting()}. Here is your shop floor.
          </p>
          <h1
            className="mt-1 text-[28px] font-extrabold leading-tight tracking-tight"
            style={{ color: "var(--foreground)" }}
          >
            Here&apos;s your shop floor.
          </h1>
          <p
            className="mt-2 max-w-[64ch] text-[13px] leading-relaxed"
            style={{ color: "var(--muted-foreground)" }}
          >
            Stock on hand, today&apos;s takings, and what needs doing before close.
          </p>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} kpi={kpi} />
          ))}
        </section>

        <section className="mt-8">
          <SetupCard />
        </section>

        <section className="mt-8">
          <h2 className="text-[15px] font-semibold leading-snug" style={{ color: "var(--foreground)" }}>
            Things to do today
          </h2>
          <ul className="mt-3 space-y-2">
            {tasks.map((task) => (
              <li key={task.id}>
                <TaskRow task={task} />
              </li>
            ))}
          </ul>
          {tasks.length === 0 && (
            <div className="mt-3 rounded-xl border border-dashed p-6 text-center" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
              <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
                Nothing scheduled for today. You&apos;re caught up.
              </p>
            </div>
          )}
        </section>

        <section className="mt-8 flex flex-wrap gap-3">
          <Button
            onClick={() => toast.add({ title: "Sale recorded." })}
            className="bg-primary text-primary-foreground"
          >
            Record sale
          </Button>
          <Button variant="outline" onClick={() => toast.add({ title: "Stock receipt opened." })}>
            Receive stock
          </Button>
        </section>
      </motion.div>
    </main>
  );
}
