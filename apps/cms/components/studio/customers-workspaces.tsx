"use client";

import { useMemo, useState } from "react";
import {
  IconBuildingStore,
  IconCheck,
  IconInfoCircle,
  IconPlus,
  IconSearch,
  IconUsers,
} from "@tabler/icons-react";
import { Button, Checkbox, Input } from "@/components/ui/studio-controls";

const segments = [
  { name: "Customers who have purchased at least once", activity: "Created at 5:52 am" },
  { name: "Email subscribers", activity: "Created at 5:52 am" },
  { name: "Abandoned checkouts in the last 30 days", activity: "Created at 5:52 am" },
  { name: "Customers who have purchased more than once", activity: "Created at 5:52 am" },
  { name: "Customers who haven't purchased", activity: "Created at 5:52 am" },
];

export function CustomerSegmentsPage() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const filtered = useMemo(
    () => segments.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  );
  const allSelected = filtered.length > 0 && filtered.every((item) => selected.includes(item.name));

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? filtered.map((item) => item.name) : []);
  };

  return (
    <section className="space-y-5 text-sm">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Customers</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Segments</h1>
        </div>
        <Button className="h-9 rounded-lg px-4" onClick={() => undefined}>
          <IconPlus className="size-4" /> Create segment
        </Button>
      </header>

      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search segments"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search segments"
              className="h-9 rounded-lg pl-9"
            />
          </div>
          <span className="text-xs text-muted-foreground">{filtered.length} saved segments</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="w-12 px-4 py-3">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all segments" />
                </th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="w-40 px-4 py-3 text-right font-medium">% of customers</th>
                <th className="w-52 px-4 py-3 font-medium">Last activity</th>
                <th className="w-40 px-4 py-3 font-medium">Created by</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => {
                const checked = selected.includes(item.name);
                return (
                  <tr key={item.name} className={`transition-colors hover:bg-muted/40 ${checked ? "bg-muted/50" : ""}`}>
                    <td className="px-4 py-3">
                      <Checkbox checked={checked} onCheckedChange={(value) => setSelected((current) => value ? [...current, item.name] : current.filter((name) => name !== item.name))} aria-label={`Select ${item.name}`} />
                    </td>
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-right text-xs">0%</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{item.activity}</td>
                    <td className="px-4 py-3 text-xs"><span className="inline-flex items-center gap-1.5"><IconCheck className="size-3.5 text-primary" /> Zerocraft</span></td>
                    <td className="px-4 py-3 text-right text-muted-foreground">•••</td>
                  </tr>
                );
              })}
              {!filtered.length && <tr><td colSpan={6} className="px-4 py-14 text-center text-sm text-muted-foreground">No segments found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">Learn more about segments</p>
    </section>
  );
}

export function CustomerCompaniesPage() {
  return (
    <section className="space-y-5 text-sm">
      <header>
        <p className="text-xs font-medium text-muted-foreground">Customers</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Companies</h1>
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-900 dark:text-sky-100">
        <IconInfoCircle className="mt-0.5 size-5 shrink-0" />
        <p><span className="font-semibold">App behavior with B2B orders.</span> Some apps may not attribute B2B orders correctly on your current plan. Check that B2B orders are assigned to a company, not just an individual customer.</p>
      </div>

      <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-border bg-background px-6 py-12 text-center shadow-sm">
        <div className="mb-5 grid size-20 place-items-center rounded-3xl bg-muted text-primary">
          <IconBuildingStore className="size-10" stroke={1.5} />
        </div>
        <h2 className="text-base font-semibold">Bring the power of customization to your B2B business</h2>
        <p className="mt-2 max-w-md text-xs leading-5 text-muted-foreground">Everything you need for B2B is in one place. Get started by adding a company and assigning custom pricing, net payment terms, and permissions for multiple locations and buyers.</p>
        <Button className="mt-5 h-9 rounded-lg px-4" onClick={() => undefined}><IconPlus className="size-4" /> Add company</Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">Learn more about companies</p>
    </section>
  );
}

