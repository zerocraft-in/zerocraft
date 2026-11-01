import Link from "next/link";
import type { ReactNode } from "react";
import {
  IconArrowLeft,
  IconArrowUpRight,
  IconBuildingStore,
  IconChartDots,
  IconCheck,
  IconChevronDown,
  IconLock,
  IconUsers,
} from "@tabler/icons-react";
import { storePage } from "@/lib/platform/page-access";

function DetailSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-medium tracking-tight text-foreground">{title}</h2>
        {description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function PrivacyDisclosure({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open className="group border-b last:border-b-0">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 bg-muted/35 px-4 py-3 text-xs font-medium marker:hidden [&::-webkit-details-marker]:hidden">
        {title}
        <IconChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 py-4 text-xs leading-5 text-muted-foreground">{children}</div>
    </details>
  );
}

export default async function SalesChannelsSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { store } = await storePage(slug);
  const storeName = store.name || slug;

  return (
    <main className="mx-auto w-full max-w-[800px] pb-16">
      <div className="-mx-3 mb-8 flex min-h-11 flex-wrap items-center justify-between gap-3 border-b border-border/70 px-3 pb-3 sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <Link href={`/store/${slug}/settings`} aria-label="Back to settings" className="grid size-8 shrink-0 place-items-center rounded-full border bg-background text-foreground shadow-sm transition hover:bg-muted">
            <IconArrowLeft className="size-4" />
          </Link>
          <IconChartDots className="size-4 shrink-0" />
          <span className="truncate">Sales channels</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/store/${slug}/settings/apps`} className="inline-flex h-8 items-center rounded-lg border bg-background px-3 text-xs font-medium shadow-sm transition hover:bg-muted">Manage apps</Link>
          <Link href="#channel-connections" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-foreground px-3 text-xs font-medium text-background shadow-sm transition hover:opacity-90">View connection <IconArrowUpRight className="size-3.5" /></Link>
        </div>
      </div>

      <div className="mx-auto max-w-[640px] space-y-7 px-1 sm:px-0">
        <header>
          <h1 className="text-2xl font-medium tracking-tight">Online Store</h1>
          <p className="mt-1 text-xs text-muted-foreground">by Zerocraft</p>
        </header>

        <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800">
              <IconBuildingStore className="size-5" stroke={1.7} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h2 className="text-sm font-medium">Online Store</h2>
                <span className="text-[11px] text-muted-foreground">Connected to {storeName}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">Build and manage your online storefront with products, collections, pages, and media from this store.</p>
            </div>
          </div>
        </section>

        <DetailSection title="Channel connections" description="View and manage the channels connected to this store.">
          <div id="channel-connections" className="flex min-h-12 items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
            <span className="min-w-0 truncate text-xs font-medium">Online Store</span>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-800"><IconCheck className="size-3" />Active</span>
          </div>
        </DetailSection>

        <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xs font-semibold">Billing</h2>
              <p className="mt-3 text-xl font-medium tracking-tight">Included</p>
              <span className="mt-1 inline-flex rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">No separate channel charge</span>
            </div>
            <Link href={`/store/${slug}/settings/plan`} className="rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground">View plan</Link>
          </div>
        </section>

        <DetailSection title="Activity and permissions" description="Store access is managed by your team roles and permissions.">
          <div className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
            <p className="max-w-md text-xs leading-5 text-muted-foreground">Team members can access this channel according to their assigned store permissions. Review your team before changing access.</p>
            <Link href={`/store/${slug}/settings/users`} className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border bg-background px-3 text-xs font-medium transition hover:bg-muted"><IconUsers className="size-3.5" />Users &amp; permissions</Link>
          </div>
        </DetailSection>

        <DetailSection title="Privacy" description="Store content and customer data remain governed by your store settings.">
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <PrivacyDisclosure title="Storefront content">
              <div className="grid gap-5 sm:grid-cols-2">
                <div><p className="mb-1 font-medium text-foreground">Catalog</p><p>Product names, descriptions, prices, and published product media.</p></div>
                <div><p className="mb-1 font-medium text-foreground">Store pages</p><p>Published pages and navigation used to present your online store.</p></div>
              </div>
            </PrivacyDisclosure>
            <PrivacyDisclosure title="Team access">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <IconLock className="size-4 shrink-0 text-muted-foreground" />
                <div><p className="font-medium text-foreground">Managed by store permissions</p><p className="mt-1">Staff access is assigned in Users &amp; permissions and can be reviewed at any time.</p><Link href={`/store/${slug}/settings/users`} className="mt-2 inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline">Review team access <IconArrowUpRight className="size-3" /></Link></div>
              </div>
            </PrivacyDisclosure>
          </div>
        </DetailSection>
      </div>
    </main>
  );
}
