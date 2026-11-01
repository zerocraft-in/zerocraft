import Link from "next/link";

export default function SettingsNotFound() {
  return (
    <main className="mx-auto flex min-h-[50vh] w-full max-w-[720px] items-center justify-center px-6 py-16">
      <div className="w-full rounded-xl border border-border bg-card p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Settings</p>
        <h1 className="mt-2 text-xl font-semibold">That settings section does not exist.</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Choose a section from the workspace settings navigation.</p>
        <Link href="/settings" className="mt-5 inline-flex rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background">Open settings</Link>
      </div>
    </main>
  );
}
