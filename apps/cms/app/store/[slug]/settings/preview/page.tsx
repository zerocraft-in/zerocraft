import Link from "next/link";

export default function SettingsPreviewPage() {
  return (
    <main className="mx-auto w-full max-w-[720px] pb-16">
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Settings preview</p>
        <h1 className="mt-2 text-xl font-semibold">Preview configuration</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Canonical preview route for the settings parallel slot.</p>
        <Link href="/settings" className="mt-5 inline-flex rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background">Back to settings</Link>
      </div>
    </main>
  );
}
