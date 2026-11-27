"use client";

export default function SettingsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[50vh] w-full max-w-[720px] items-center justify-center px-6 py-16">
      <div className="w-full rounded-xl border border-destructive/25 bg-destructive/[0.035] p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-destructive">Settings unavailable</p>
        <h1 className="mt-2 text-xl font-semibold">We could not load this settings page.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Refresh the workspace and try again. Your saved settings are not changed.</p>
        <button type="button" onClick={() => reset()} className="mt-5 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background">Try again</button>
      </div>
    </main>
  );
}
