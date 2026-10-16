"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  IconArrowLeft,
  IconArrowUpRight,
  IconBox,
  IconCalendarEvent,
  IconChartBar,
  IconChevronRight,
  IconCircleCheck,
  IconClock,
  IconDots,
  IconFileInvoice,
  IconGift,
  IconPackageExport,
  IconPercentage,
  IconPlus,
  IconRefresh,
  IconSettings,
  IconShoppingBag,
  IconStack3,
  IconTruckDelivery,
  IconUsers,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type StoreSection = "collections" | "customization" | "inventory" | "discounts" | "purchase-orders" | "transfers" | "gift-cards";

const content: Record<StoreSection, { eyebrow: string; title: string; description: string; action: string; icon: typeof IconBox; metrics: [string, string, string][]; rows: [string, string, string, string][] }> = {
  collections: { eyebrow: "Catalog / Merchandising", title: "Collections", description: "Group products into focused storefront experiences and seasonal drops.", action: "New collection", icon: IconStack3, metrics: [["Live collections", "6", "Across the storefront"], ["Featured products", "24", "Curated this month"], ["Conversion lift", "+18.4%", "Compared with uncategorized"]], rows: [["Spring studio drop", "12 products", "Live", "Updated today"], ["Digital essentials", "8 products", "Live", "Updated 2 days ago"], ["Giftable goods", "6 products", "Draft", "Updated 5 days ago"]] },
  customization: { eyebrow: "Storefront / Experience", title: "Customization", description: "Shape the storefront experience with visual preferences, merchandising rules, and brand details.", action: "Edit storefront", icon: IconSettings, metrics: [["Theme status", "Published", "Last published today"], ["Brand completion", "92%", "2 items need attention"], ["Active surfaces", "8", "Across your storefront"]], rows: [["Store identity", "Logo, colors and type", "Complete", "Ready to publish"], ["Homepage merchandising", "Featured collections", "Complete", "12 items configured"], ["Checkout preferences", "Delivery and contact", "Review", "1 recommendation"]] },
  inventory: { eyebrow: "Operations / Stock", title: "Inventory", description: "Keep a clear view of physical stock, reorder risk, and the value tied up in your catalog.", action: "Adjust stock", icon: IconBox, metrics: [["Units on hand", "28", "Across 4 physical SKUs"], ["Low stock", "2", "Five or fewer units"], ["Inventory value", "$1,128", "At current retail value"]], rows: [["Grid Poster", "ZC-POSTER-006", "3 units", "Reorder soon"], ["Studio Cap", "ZC-CAP-005", "7 units", "Healthy"], ["Field Notes", "ZC-NOTES-004", "18 units", "Healthy"]] },
  discounts: { eyebrow: "Growth / Offers", title: "Discounts", description: "Build simple offers that are easy to understand, track, and switch off when a campaign ends.", action: "Create discount", icon: IconPercentage, metrics: [["Active discounts", "3", "Currently available"], ["Orders influenced", "42", "This month"], ["Discounted revenue", "$2,840", "Gross value influenced"]], rows: [["WELCOME10", "10% off first order", "Active", "Ends in 18 days"], ["STUDIO20", "$20 off $150+", "Active", "No end date"], ["SPRINGDROP", "15% off collection", "Scheduled", "Starts in 4 days"]] },
  "purchase-orders": { eyebrow: "Operations / Suppliers", title: "Purchase orders", description: "Track incoming stock, supplier commitments, and the next delivery that keeps your catalog moving.", action: "New purchase order", icon: IconFileInvoice, metrics: [["Open purchase orders", "4", "Across 3 suppliers"], ["Units incoming", "96", "Expected this month"], ["Committed cost", "$4,260", "Outstanding supplier value"]], rows: [["PO-2048", "Northstar Print Co.", "48 units", "Arrives in 3 days"], ["PO-2047", "Field Supply", "32 units", "In transit"], ["PO-2046", "Northstar Print Co.", "16 units", "Awaiting confirmation"]] },
  transfers: { eyebrow: "Operations / Locations", title: "Transfers", description: "Move inventory between locations with a clear handoff trail and a reliable stock count.", action: "New transfer", icon: IconTruckDelivery, metrics: [["Open transfers", "2", "Awaiting receipt"], ["In transit", "18", "Units moving now"], ["Locations", "3", "Connected to store"]], rows: [["TR-0092", "Studio → Fulfillment", "12 units", "In transit"], ["TR-0091", "Fulfillment → Studio", "6 units", "Ready to receive"], ["TR-0090", "Studio → Event stock", "24 units", "Completed"]] },
  "gift-cards": { eyebrow: "Growth / Retention", title: "Gift cards", description: "Keep gift card issuance, balances, and redemption activity visible in one calm workspace.", action: "Issue gift card", icon: IconGift, metrics: [["Active cards", "18", "Across all balances"], ["Unredeemed value", "$1,420", "Available to customers"], ["Redeemed this month", "$680", "Across 11 orders"]], rows: [["GC-1082", "Maya Chen", "$100.00", "Active"], ["GC-1081", "Noah Williams", "$42.00", "Partially used"], ["GC-1080", "Sofia Martinez", "$0.00", "Redeemed"]] },
};

export default function StoreSectionWorkspace({ section }: { section: StoreSection }) {
  const view = content[section];
  const [query, setQuery] = useState("");
  const SectionIcon = view.icon;
  const rows = useMemo(() => view.rows.filter((row) => row.join(" ").toLowerCase().includes(query.toLowerCase())), [query, view.rows]);

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-screen-xl flex-col gap-6 pb-14">
      <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" className="mb-3 -ml-2 gap-2" render={<Link href="/studio/store" />} nativeButton={false}><IconArrowLeft /> Store overview</Button>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{view.eyebrow}</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.06em]">{view.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{view.description}</p>
        </div>
        <div className="flex gap-2"><Button variant="outline" size="icon" aria-label="Refresh workspace"><IconRefresh /></Button><Button className="gap-2"><IconPlus /> {view.action}</Button></div>
      </motion.header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label={`${view.title} summary`}>
        {view.metrics.map(([label, value, note], index) => <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}><Card size="sm" className="h-full"><CardHeader className="!flex-row items-start justify-between"><div><CardDescription>{label}</CardDescription><CardTitle className="mt-2 text-2xl tabular-nums">{value}</CardTitle></div><span className="rounded-xl bg-muted p-2.5 text-muted-foreground"><SectionIcon size={18} /></span></CardHeader><CardContent className="text-xs text-muted-foreground">{note}</CardContent></Card></motion.div>)}
      </section>

      <Card className="overflow-hidden">
        <CardHeader className="border-b"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>{view.title} activity</CardTitle><CardDescription className="mt-1">Review the latest records and keep your store moving.</CardDescription></div><div className="flex items-center gap-2"><div className="relative"><IconChartBar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records" className="w-full pl-9 sm:w-56" /></div><Button variant="outline" size="icon" aria-label="More actions"><IconDots /></Button></div></div></CardHeader>
        <CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-6 py-3 font-medium">Record</th><th className="px-6 py-3 font-medium">Reference</th><th className="px-6 py-3 font-medium">Quantity / value</th><th className="px-6 py-3 font-medium">Status</th><th className="px-6 py-3 font-medium">Updated</th><th /></tr></thead><tbody>{rows.map((row, index) => <motion.tr key={row[0]} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.04 }} className="border-t transition-colors hover:bg-muted/40"><td className="px-6 py-4 font-medium">{row[0]}</td><td className="px-6 py-4 text-muted-foreground">{row[1]}</td><td className="px-6 py-4 tabular-nums">{row[2]}</td><td className="px-6 py-4"><Badge variant={row[3].toLowerCase().includes("active") || row[3].toLowerCase().includes("healthy") || row[3].toLowerCase().includes("live") || row[3].toLowerCase().includes("complete") ? "default" : "secondary"}>{row[3]}</Badge></td><td className="px-6 py-4 text-muted-foreground">{row[3].includes("Arrives") || row[3].includes("days") ? row[3] : "Recently"}</td><td className="px-6 py-4 text-right"><Button variant="ghost" size="icon-sm" aria-label={`Open ${row[0]}`}><IconChevronRight /></Button></td></motion.tr>)}</tbody></table>{!rows.length && <div className="grid min-h-48 place-items-center text-sm text-muted-foreground">No records match your search.</div>}</div></CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3"><Card className="bg-primary text-primary-foreground"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><IconCircleCheck size={17} /> Good to know</CardTitle><CardDescription className="text-primary-foreground/70">Your {view.title.toLowerCase()} workspace is ready for the next action.</CardDescription></CardHeader><CardContent><Button render={<Link href="/studio/store" />} nativeButton={false} variant="secondary" size="sm" className="gap-1">Back to overview <IconArrowUpRight size={14} /></Button></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Need a hand?</CardTitle><CardDescription>Use the store overview to spot the next best action.</CardDescription></CardHeader><CardContent><Link href="/studio/store" className="text-sm font-medium underline-offset-4 hover:underline">Open commerce overview</Link></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Connected workspace</CardTitle><CardDescription>Catalog and operations stay in sync with your store data.</CardDescription></CardHeader><CardContent className="flex items-center gap-2 text-sm text-muted-foreground"><IconUsers size={16} /> Staff access enabled</CardContent></Card></div>
    </main>
  );
}
