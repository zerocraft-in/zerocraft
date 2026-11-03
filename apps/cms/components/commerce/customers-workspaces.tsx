"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IconBuildingStore,
  IconInfoCircle,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import { Button, Input } from "@zerocraft/components/ui/studio-controls";

type StoreCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  orderCount: number;
  paidByCurrency: Record<string, number>;
  lastOrderAt: string;
};

function formatCustomerTotal(values: Record<string, number>) {
  const entries = Object.entries(values);
  if (!entries.length) return "—";
  return entries
    .map(([currency, total]) => {
      try {
        return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(total);
      } catch {
        return `${currency} ${total.toFixed(2)}`;
      }
    })
    .join(" · ");
}

export function CustomerDirectoryPage() {
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<StoreCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/store/customers", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as { customers?: StoreCustomer[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Customers could not be loaded.");
        if (active) {
          setCustomers(Array.isArray(payload.customers) ? payload.customers : []);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Customers could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(
    () => customers.filter((customer) =>
      `${customer.name} ${customer.email} ${customer.phone}`.toLowerCase().includes(query.trim().toLowerCase()),
    ),
    [customers, query],
  );

  return (
    <section className="space-y-5 text-sm">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Customers</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Customer directory</h1>
        </div>
        <p className="text-xs text-muted-foreground">Customer records are grouped from store orders.</p>
      </header>

      {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search customers"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search customers by name, email, or phone"
              className="h-9 rounded-lg pl-9"
            />
          </div>
          <span className="text-xs text-muted-foreground">{loading ? "Loading customers…" : `${filtered.length} customers`}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="w-28 px-4 py-3 text-right font-medium">Orders</th>
                <th className="w-48 px-4 py-3 text-right font-medium">Paid total</th>
                <th className="w-48 px-4 py-3 text-right font-medium">Last order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((customer) => (
                  <tr key={customer.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3"><p className="font-medium">{customer.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{customer.email || "No email on order"}</p></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{customer.phone || "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{customer.orderCount}</td>
                    <td className="px-4 py-3 text-right text-xs tabular-nums">{formatCustomerTotal(customer.paidByCurrency)}</td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">{customer.lastOrderAt ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(customer.lastOrderAt)) : "—"}</td>
                  </tr>
              ))}
              {!loading && !filtered.length && <tr><td colSpan={5} className="px-4 py-14 text-center text-sm text-muted-foreground">{query ? "No customers match this search." : "No customer orders are available yet."}</td></tr>}
              {loading && <tr><td colSpan={5} className="px-4 py-14 text-center text-sm text-muted-foreground">Loading customer records…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">Customer records reflect completed store orders and the contact details supplied at checkout.</p>
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

