"use client";

import { IconInfoCircle, IconLanguage } from "@tabler/icons-react";

const cardClass = "overflow-hidden rounded-2xl border bg-card shadow-sm";

export function LanguagesSettings() {
  return (
    <main className="mx-auto w-full max-w-[800px] pb-20">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-medium tracking-tight">Languages</h1><p className="mt-1 text-xs leading-5 text-muted-foreground">Manage the languages used by your storefront and customer-facing content.</p></div>
        <div className="flex gap-2"><button type="button" disabled title="Translation export is not available yet" className="h-8 rounded-full border bg-card px-3 text-[11px] font-medium text-muted-foreground opacity-60">Export</button><button type="button" disabled title="Translation import is not available yet" className="h-8 rounded-full border bg-card px-3 text-[11px] font-medium text-muted-foreground opacity-60">Import</button><button type="button" disabled title="Additional language publishing is not available yet" className="h-8 rounded-full bg-foreground px-3 text-[11px] font-medium text-background opacity-60">Add language</button></div>
      </header>

      <section className={cardClass}>
        <div className="grid grid-cols-[minmax(0,1fr)_110px_90px] gap-3 bg-muted/40 px-4 py-2.5 text-[10px] font-medium text-muted-foreground sm:grid-cols-[minmax(0,1fr)_150px_120px] sm:px-5"><span>Language</span><span>Status</span><span>Domains</span></div>
        <div className="grid grid-cols-[minmax(0,1fr)_110px_90px] items-center gap-3 border-t px-4 py-3.5 text-xs sm:grid-cols-[minmax(0,1fr)_150px_120px] sm:px-5">
          <div className="min-w-0"><p className="font-medium">English</p><p className="mt-1 text-[11px] text-muted-foreground">Default storefront language</p></div>
          <span className="w-fit rounded-md bg-emerald-500/15 px-2 py-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">Default</span>
          <span className="text-[11px] text-muted-foreground">Storefront</span>
        </div>
        <div className="flex items-start gap-2 border-t bg-sky-500/5 px-4 py-3 text-[11px] leading-5 text-muted-foreground sm:px-5"><IconInfoCircle className="mt-0.5 size-4 shrink-0 text-sky-600" /><p>Additional language records, translation imports, and publishing status are not stored for this shop yet. English is the current storefront language.</p></div>
      </section>
      <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground"><IconLanguage className="size-3.5" />Translation management will be available when language records are supported.</p>
    </main>
  );
}
