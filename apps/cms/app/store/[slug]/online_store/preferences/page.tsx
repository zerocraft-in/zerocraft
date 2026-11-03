import Link from "next/link";
import { IconArrowUpRight, IconBuildingStore, IconCreditCard, IconWorld } from "@tabler/icons-react";
import { storePage } from "@/lib/platform/page-access";

const preferenceLinks = [
  { title: "Store details", description: "Store identity, contact details, currency, units, and time zone.", href: "settings", icon: IconBuildingStore },
  { title: "Checkout", description: "Customer details, order processing, and checkout behavior.", href: "settings/checkout", icon: IconCreditCard },
  { title: "Domains", description: "Review the domains connected to your storefront.", href: "settings/domains", icon: IconWorld },
];

export default async function OnlineStorePreferencesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { store } = await storePage(slug);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 pb-12">
      <header>
        <p className="text-xs text-muted-foreground">Online Store · {store.name || slug}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Preferences</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage the store settings that affect your online storefront.</p>
      </header>
      <section className="grid gap-3 sm:grid-cols-2">
        {preferenceLinks.map(({ title, description, href, icon: Icon }) => (
          <Link key={href} href={`/store/${slug}/${href}`} className="group rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40">
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-9 place-items-center rounded-lg border bg-background"><Icon className="size-4" /></span>
              <IconArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <h2 className="mt-4 text-sm font-medium">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
