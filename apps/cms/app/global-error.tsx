"use client";

import { useEffect } from "react";
import { IconAlertTriangle, IconHome, IconRefresh } from "@tabler/icons-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Fatal CMS render error", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-w-80 bg-background font-sans text-foreground">
        <main className="grid min-h-svh place-items-center px-4 py-12">
          <section
            role="alert"
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-lg"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-destructive/10 text-destructive">
              <IconAlertTriangle className="size-5" />
            </span>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Workspace recovery
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              ZeroCraft CMS could not start
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              A fatal interface error interrupted the workspace. Retry the render or return to the dashboard.
            </p>
            {error.digest ? (
              <p className="mt-4 rounded-lg bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
                Reference: {error.digest}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <IconRefresh className="size-4" />
                Try again
              </button>
              <a
                href="/"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-input bg-background px-4 text-sm font-medium transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <IconHome className="size-4" />
                Dashboard
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
