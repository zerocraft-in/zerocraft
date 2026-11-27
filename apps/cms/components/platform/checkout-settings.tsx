import Link from "next/link";
import type { ReactNode } from "react";
import { scopedPath } from "@/lib/platform/scope";
import {
  IconArrowUpRight,
  IconCheck,
  IconChevronRight,
  IconInfoCircle,
  IconLanguage,
  IconMail,
  IconMapPin,
  IconShoppingBag,
  IconUser,
} from "@tabler/icons-react";

function CheckoutSection({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div>
          <h2 className="text-sm font-medium tracking-tight">{title}</h2>
          {description && <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function FieldRow({ title, detail, value, icon: Icon }: { title: string; detail?: string; value: string; icon?: typeof IconUser }) {
  return (
    <div className="flex min-h-[50px] items-center gap-3 border-b last:border-b-0 px-4 py-2.5">
      {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" stroke={1.7} />}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">{title}</p>
        {detail && <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{detail}</p>}
      </div>
      <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">{value}</span>
    </div>
  );
}

const cardClass = "overflow-hidden rounded-2xl border bg-card shadow-sm";

export function CheckoutSettings({ pathname }: { pathname: string }) {
  return (
    <main className="mx-auto w-full max-w-[800px] space-y-7 pb-20">
      <h1 className="text-2xl font-medium tracking-tight">Checkout</h1>

      <CheckoutSection
        title="Configurations"
        description="Review the checkout flow used by your online store."
        action={<span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><IconInfoCircle className="size-3.5" />Current setup</span>}
      >
        <div className={`${cardClass} flex flex-wrap items-center justify-between gap-3 px-4 py-3.5`}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold">Secure store checkout</p><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">Current</span></div>
            <p className="mt-1 text-[11px] text-muted-foreground">Sign-in, delivery, and payment rules are enforced by the checkout service.</p>
          </div>
          <span className="inline-flex h-8 items-center rounded-lg border bg-muted/50 px-3 text-xs font-medium text-muted-foreground">Managed by checkout service</span>
        </div>
      </CheckoutSection>

      <CheckoutSection title="Customer contact method" description="Customers sign in before checkout. A phone number is required for order delivery.">
        <div className={`${cardClass} space-y-4 p-4 sm:p-5`}>
          <div className="flex items-start gap-2.5">
            <IconCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
            <div><p className="text-xs font-medium">Customer account sign-in</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">Required to create and securely track an order.</p></div>
          </div>
          <div className="ml-6 flex items-start gap-2.5">
            <IconCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
            <div><p className="text-xs font-medium">Phone number for delivery</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">Collected with the shipping address for fulfillment.</p></div>
          </div>
          <div className="ml-6 flex items-start gap-2.5">
            <IconMail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-5 text-muted-foreground">Checkout email notifications are handled by the customer account and order notification settings.</p>
          </div>
        </div>
      </CheckoutSection>

      <CheckoutSection title="Customer information" description="Fields currently required to place an order.">
        <div className={cardClass}>
          <FieldRow icon={IconUser} title="Full name" detail="Used to identify the recipient." value="Required" />
          <FieldRow icon={IconMapPin} title="Street address" detail="Shipping address line 1." value="Required" />
          <FieldRow title="City, state, and postal code" value="Required" />
          <FieldRow title="Country" value="Required" />
          <FieldRow icon={IconUser} title="Shipping address phone number" detail="Used for delivery coordination." value="Required" />
        </div>
      </CheckoutSection>

      <CheckoutSection title="Marketing opt-in" description="Marketing consent is not collected in the current checkout flow.">
        <div className={`${cardClass} flex items-start gap-3 p-4 sm:p-5`}>
          <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded border border-border text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0 flex-1"><p className="text-xs font-medium">Marketing signup is not enabled</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground">Connect a supported marketing integration before collecting customer consent at checkout.</p></div>
          <Link href={scopedPath("/settings/integrations", pathname)} className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium underline-offset-4 hover:underline">Integrations <IconArrowUpRight className="size-3" /></Link>
        </div>
      </CheckoutSection>

      <CheckoutSection title="Tipping" description="Tipping options are not available in the current checkout flow.">
        <div className={`${cardClass} flex items-center gap-3 px-4 py-3.5`}>
          <span className="grid size-4 shrink-0 place-items-center rounded border border-border" aria-hidden="true" />
          <span className="flex-1 text-xs text-muted-foreground">Show tipping options at checkout</span>
          <span className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">Unavailable</span>
        </div>
      </CheckoutSection>

      <CheckoutSection
        title="Abandoned checkout emails"
        description="Send a reminder to customers who did not finish checking out."
        action={<Link href={scopedPath("/store/orders/abandoned-checkouts", pathname)} className="inline-flex h-7 items-center rounded-full bg-muted px-3 text-[11px] font-medium text-muted-foreground transition hover:text-foreground">View checkouts</Link>}
      >
        <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-xs leading-5 text-sky-900 dark:text-sky-100"><span className="inline-flex items-start gap-2"><IconInfoCircle className="mt-0.5 size-4 shrink-0" /><span>Checkout sessions are not currently saved, so there are no abandoned checkout records to email.</span></span></div>
          <div className="mt-4 flex items-start gap-2.5 text-xs text-muted-foreground"><span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded border border-border" aria-hidden="true" />Send abandoned checkout emails automatically</div>
          <p className="mt-3 pl-6 text-[11px] text-muted-foreground">Email recovery can be configured after checkout session tracking is available.</p>
        </div>
      </CheckoutSection>

      <CheckoutSection title="Checkout language" description="Language used by the current customer checkout experience.">
        <div className={`${cardClass} flex min-h-12 items-center justify-between gap-3 px-4 py-3`}>
          <span className="inline-flex items-center gap-2 text-xs font-medium"><IconLanguage className="size-4 text-muted-foreground" />English</span>
          <Link href={scopedPath("/settings/languages", pathname)} className="inline-flex h-7 items-center rounded-full bg-muted px-3 text-[11px] font-medium transition hover:bg-muted/70">Language settings</Link>
        </div>
      </CheckoutSection>

      <CheckoutSection title="Advanced preferences">
        <div className={cardClass}>
          <div className="flex min-h-[58px] items-center gap-3 border-b px-4 py-3">
            <IconMapPin className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1"><p className="text-xs font-medium">Address collection</p><p className="mt-0.5 text-[11px] text-muted-foreground">A complete shipping address is required for delivery.</p></div>
            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-800">Required</span>
            <IconChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </div>
          <div className="flex min-h-[58px] items-center gap-3 px-4 py-3">
            <IconShoppingBag className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1"><p className="text-xs font-medium">Cart quantity limits</p><p className="mt-0.5 text-[11px] text-muted-foreground">Up to 30 product lines and 20 units per line.</p></div>
            <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">Default</span>
            <IconChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </div>
        </div>
      </CheckoutSection>

      <CheckoutSection title="Checkout rules" description="Rules for how the cart or checkout responds to different customer scenarios.">
        <div className="flex min-h-12 items-center justify-center rounded-2xl border border-dashed bg-card/50">
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-muted px-3 text-[11px] font-medium text-muted-foreground"><IconInfoCircle className="size-3.5" />Rules are not available yet</span>
        </div>
      </CheckoutSection>
    </main>
  );
}
