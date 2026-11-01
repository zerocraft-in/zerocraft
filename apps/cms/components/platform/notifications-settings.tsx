"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IconBell,
  IconBuildingStore,
  IconChevronRight,
  IconCode,
  IconInfoCircle,
  IconMail,
  IconUsers,
} from "@tabler/icons-react";
import { Input } from "@zerocraft/components/ui/input";
import { scopedPath } from "@/lib/platform/scope";

type StoreRecord = {
  slug: string;
  settings?: { contactEmail?: string };
};

function NotificationRow({ icon: Icon, title, description, status }: { icon: typeof IconBell; title: string; description: string; status: string }) {
  return (
    <div className="flex min-h-[64px] items-center gap-3 px-4 py-3 sm:px-5">
      <Icon className="size-4 shrink-0 text-muted-foreground" stroke={1.7} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">{title}</p>
        <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{description}</p>
      </div>
      <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">{status}</span>
      <IconChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground/60" />
    </div>
  );
}

const cardClass = "overflow-hidden rounded-2xl border bg-card shadow-sm";

export function NotificationsSettings({ pathname }: { pathname: string }) {
  const slug = pathname.match(/^\/store\/([^/]+)/)?.[1] || "";
  const [contactEmail, setContactEmail] = useState("");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/platform/stores", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error("Store details could not be loaded.");
        const store = (payload.stores as StoreRecord[] | undefined)?.find((item) => item.slug === slug);
        setContactEmail(store?.settings?.contactEmail || "");
        setLoadState("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadState("error");
      });
    return () => controller.abort();
  }, [slug]);

  return (
    <main className="mx-auto w-full max-w-[800px] space-y-7 pb-20">
      <h1 className="text-2xl font-medium tracking-tight">Notifications</h1>

      <section className="space-y-2.5">
        <div>
          <h2 className="text-sm font-medium tracking-tight">Sender email</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">The contact email associated with your store and email notifications.</p>
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-sky-950 dark:text-sky-100 sm:p-4">
          <IconInfoCircle className="mt-0.5 size-4 shrink-0" />
          <p className="text-[11px] leading-5">Your store contact email is shown below. Outbound email delivery and its verified sender are configured centrally; changing the contact email does not change the verified sender address.</p>
        </div>
        <div className={`${cardClass} p-3`}>
          <Input aria-label="Store contact email" readOnly value={contactEmail} placeholder={loadState === "loading" ? "Loading store email…" : loadState === "error" ? "Store email could not be loaded" : "No contact email configured"} className="h-9 text-xs" />
          {loadState === "ready" && <Link href={scopedPath("/settings/general", pathname)} className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"><IconBuildingStore className="size-3.5" />Manage store contact details</Link>}
        </div>
      </section>

      <div className={`${cardClass} divide-y divide-border/70`}>
        <NotificationRow icon={IconBell} title="Customer notifications" description="Outbound email delivery is configured centrally; customer notification templates and preferences are not managed here." status="Provider managed" />
        <NotificationRow icon={IconUsers} title="Staff notifications" description="Staff alerts use account notification preferences; this screen does not edit those preferences." status="Account managed" />
        <NotificationRow icon={IconBuildingStore} title="Fulfillment notifications" description="Fulfillment request email preferences are not configurable from this page yet." status="Not configured" />
      </div>

      <div className={`${cardClass} divide-y divide-border/70`}>
        <NotificationRow icon={IconCode} title="Webhooks" description="Send store event payloads to external URLs. No webhook settings are connected here." status="Not connected" />
      </div>
      <p className="text-xs leading-5 text-muted-foreground">Store-level notification templates, customer preferences, and webhook delivery controls are not available on this page yet.</p>
    </main>
  );
}
