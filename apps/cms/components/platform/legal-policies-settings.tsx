import {
  IconBuildingStore,
  IconChevronRight,
  IconFileText,
  IconLock,
  IconMapPin,
  IconReceipt,
  IconTruck,
} from "@tabler/icons-react";

const policies = [
  { title: "Return and refund policy", icon: IconReceipt },
  { title: "Privacy policy", icon: IconLock },
  { title: "Terms of service", icon: IconFileText },
  { title: "Shipping policy", icon: IconTruck },
  { title: "Contact information", icon: IconMapPin, required: true },
  { title: "Legal notice", icon: IconBuildingStore },
];

const cardClass = "overflow-hidden rounded-2xl border bg-card shadow-sm";

export function LegalPoliciesSettings() {
  return (
    <main className="mx-auto w-full max-w-[800px] space-y-7 pb-20">
      <h1 className="text-2xl font-medium tracking-tight">Policies</h1>

      <section className="space-y-2.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium tracking-tight">Return and cancellation rules</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Set conditions and fees for return and cancellation requests.</p>
          </div>
          <button type="button" disabled title="Return rules are not configurable yet" className="inline-flex h-7 items-center gap-1 rounded-full bg-muted px-3 text-[11px] font-medium text-muted-foreground opacity-70">
            <span aria-hidden="true" className="text-sm">+</span> Rule
          </button>
        </div>
        <div className={`${cardClass} flex min-h-12 items-center gap-3 px-4 py-3`}>
          <span className="min-w-0 flex-1 text-xs font-medium">Default rules</span>
          <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">No rules set</span>
          <IconChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </div>
      </section>

      <section className="space-y-2.5">
        <div>
          <h2 className="text-sm font-medium tracking-tight">Written policies</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Policies can appear in the footer of your online store and during checkout.</p>
        </div>
        <div className={cardClass}>
          {policies.map(({ title, icon: Icon, required }, index) => (
            <div key={title} className={`flex min-h-[46px] items-center gap-3 px-4 py-2.5 ${index > 0 ? "border-t border-border/70" : ""}`}>
              <Icon className="size-4 shrink-0 text-muted-foreground" stroke={1.7} />
              <span className="min-w-0 flex-1 truncate text-xs font-medium">{title}</span>
              {required && <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-medium text-orange-800">Required</span>}
              <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">No policy set</span>
              <IconChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </div>
          ))}
        </div>
        <p className="max-w-3xl text-xs leading-5 text-muted-foreground">Policy templates and legal guidance are not provided here. You are responsible for ensuring your policies are accurate and comply with applicable laws.</p>
      </section>
    </main>
  );
}
