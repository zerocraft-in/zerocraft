import Link from "next/link";
import type { ReactNode } from "react";
import {
  IconChartDots,
  IconChevronRight,
  IconDatabase,
  IconFileText,
  IconInfoCircle,
  IconLock,
  IconMail,
  IconWorld,
} from "@tabler/icons-react";
import { scopedPath } from "@/lib/platform/scope";

function PrivacySection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div>
        <h2 className="text-sm font-medium tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function PrivacyRow({ icon: Icon, title, description, badge, href }: { icon: typeof IconLock; title: string; description: string; badge?: string; href?: string }) {
  const content = (
    <div className="flex min-h-[58px] items-center gap-3 px-4 py-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" stroke={1.7} />
      <div className="min-w-0 flex-1"><p className="text-xs font-medium">{title}</p><p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{description}</p></div>
      {badge && <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">{badge}</span>}
      {href && <IconChevronRight className="size-4 shrink-0 text-muted-foreground" />}
    </div>
  );
  return href ? <Link href={href} className="block transition-colors hover:bg-muted/30">{content}</Link> : content;
}

const cardClass = "overflow-hidden rounded-2xl border bg-card shadow-sm";

export function PrivacySettings({ pathname }: { pathname: string }) {
  return (
    <main className="mx-auto w-full max-w-[800px] space-y-7 pb-20">
      <h1 className="text-2xl font-medium tracking-tight">Customer privacy</h1>

      <PrivacySection title="Privacy settings">
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sky-950 dark:text-sky-100 sm:p-5">
          <p className="flex items-center gap-2 text-xs font-medium"><IconInfoCircle className="size-4 shrink-0" />Privacy automation is not configured</p>
          <p className="mt-2 text-xs leading-5 text-sky-900/80 dark:text-sky-100/80">Consent automation and privacy request workflows are not available in this store yet. Review your policies and privacy obligations before collecting customer data.</p>
          <button type="button" disabled title="Privacy automation is not available yet" className="mt-3 inline-flex h-7 items-center rounded-full bg-sky-900/10 px-3 text-[11px] font-medium text-sky-950/60 dark:bg-white/10 dark:text-white/60">Enable automation</button>
        </div>
      </PrivacySection>

      <div className={`${cardClass} divide-y divide-border/70`}>
        <PrivacyRow icon={IconFileText} title="Privacy policy" description="Add a policy explaining how your store uses visitor and customer data." badge="Recommended" href={scopedPath("/settings/legal", pathname)} />
        <PrivacyRow icon={IconWorld} title="Cookie banner" description="A consent banner is not configured for this storefront." badge="Not configured" />
        <PrivacyRow icon={IconChartDots} title="Data sharing opt-out page" description="No visitor opt-out page is configured." badge="Not configured" />
        <div className="m-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-950 dark:text-amber-100">
          <IconInfoCircle className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" />
          <p className="text-[11px] leading-5">Visitors currently have no store page for submitting data sharing opt-out requests.</p>
        </div>
      </div>

      <div className={`${cardClass} flex min-h-[54px] items-center gap-3 px-4 py-3`}>
        <IconChartDots className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 text-xs font-medium">External data sharing</span>
        <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">No integrations configured</span>
      </div>
      <p className="-mt-4 text-xs leading-5 text-muted-foreground">No privacy integration is configured here to manage external data sharing.</p>

      <PrivacySection title="Marketing settings" description="Marketing consent is not collected during checkout at this time.">
        <div className={cardClass}>
          <PrivacyRow icon={IconMail} title="Email and SMS marketing in checkout" description="Customer marketing preferences are not currently collected." badge="Unavailable" />
          <div className="border-t border-border/70"><PrivacyRow icon={IconLock} title="Double opt-in for marketing" description="Confirmation workflows are unavailable until marketing consent collection is connected." badge="Unavailable" /></div>
        </div>
      </PrivacySection>

      <PrivacySection title="Data storage hosting location" description="The store uses its connected database and file storage providers.">
        <div className={`${cardClass} flex min-h-[54px] items-center gap-3 px-4 py-3`}>
          <IconDatabase className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 text-xs font-medium">Storage region</span>
          <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">Managed by provider</span>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">The provider’s region is not exposed in this store settings page. Check your database and storage provider configuration for the hosting location.</p>
      </PrivacySection>

      <p className="text-xs leading-5 text-muted-foreground">Privacy settings are provided for store management convenience. You remain responsible for compliance with applicable laws and regulations.</p>
    </main>
  );
}
