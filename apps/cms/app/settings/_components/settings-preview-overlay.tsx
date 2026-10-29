"use client";

import { useRouter } from "next/navigation";

export function SettingsPreviewOverlay() {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 bg-black/45 p-4 backdrop-blur-[2px]" role="presentation">
      <button type="button" aria-label="Close settings preview" className="absolute inset-0 cursor-default" onClick={() => router.back()} />
      <section role="dialog" aria-modal="true" aria-labelledby="settings-preview-title" className="relative mx-auto mt-[10vh] w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Settings preview</p><h2 id="settings-preview-title" className="mt-1 text-lg font-semibold">Preview configuration</h2></div>
          <button type="button" onClick={() => router.back()} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">Close</button>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">This intercepted route keeps the settings workspace in context while previewing a configuration panel.</p>
      </section>
    </div>
  );
}
