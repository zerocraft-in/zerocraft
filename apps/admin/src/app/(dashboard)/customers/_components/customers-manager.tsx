"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@zerocraft/ui/button";
import { Input } from "@zerocraft/ui/input";
import { Search, Plus } from "lucide-react";
import { Checkbox } from "@zerocraft/ui/checkbox";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@zerocraft/ui/empty";
import { Card, CardContent, CardFooter } from "@zerocraft/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@zerocraft/ui/table";
import { Separator } from "@zerocraft/ui/separator";
import {
  CustomerRow,
  CustomerFilter,
  CustomerSortField,
  customerDisplayName,
  initials,
  formatCurrency,
} from "../types";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

type SortDirection = "asc" | "desc";

interface CustomersManagerProps {
  organizationId: string;
  permissions: Set<string>;
}

export default function CustomersManager({
  organizationId,
  permissions,
}: CustomersManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const canCreate = permissions.has("customers.manage");

  // ---- URL-synced filter state ----
  const [searchQuery, setSearchQuery] = React.useState(
    () => searchParams.get("q") ?? ""
  );
  const [stateFilter] = React.useState<CustomerFilter>(
    () => (searchParams.get("state") ?? "all") as CustomerFilter
  );
  const [pageIndex] = React.useState(() => {
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    return page - 1;
  });
  const [pageSize] = React.useState(() => {
    const size = Number(searchParams.get("page_size")) || DEFAULT_PAGE_SIZE;
    return PAGE_SIZE_OPTIONS.includes(size) ? size : DEFAULT_PAGE_SIZE;
  });
  const [sortField] = React.useState<CustomerSortField>(() => {
    const valid: CustomerSortField[] = [
      "name", "email", "orders_count", "total_spent", "last_order_at", "created_at",
    ];
    const raw = (searchParams.get("sort") ?? "created_at") as CustomerSortField;
    return valid.includes(raw) ? raw : "created_at";
  });
  const [sortDirection] = React.useState<SortDirection>(() =>
    searchParams.get("dir") === "asc" ? "asc" : "desc"
  );

  // Push filter/sort/pagination state to the URL without scrolling.
  React.useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (stateFilter && stateFilter !== "all") params.set("state", stateFilter);
    params.set("page", String(pageIndex + 1));
    params.set("page_size", String(pageSize));
    params.set("sort", sortField);
    params.set("dir", sortDirection);
    const href = `${pathname}?${params.toString()}`;
    const current = `${window.location.pathname}${window.location.search}`;
    if (href !== current) {
      router.push(href, { scroll: false });
    }
  }, [
    searchQuery, stateFilter, pageIndex, pageSize, sortField, sortDirection, pathname, router,
  ]);

  // ---- Fetch customers ----
  const [customers, setCustomers] = React.useState<CustomerRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadCustomers() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/customers?q=${encodeURIComponent(searchQuery)}` +
          `&state=${encodeURIComponent(stateFilter)}` +
          `&page=${pageIndex + 1}` +
          `&page_size=${pageSize}` +
          `&sort=${sortField}` +
          `&dir=${sortDirection}`
        );
        if (!response.ok) throw new Error("Failed to load customers");
        const data = await response.json();
        setCustomers(data.customers);
        setTotal(data.total ?? 0);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load customers",
        );
      } finally {
        setLoading(false);
      }
    }
    loadCustomers();
  }, [organizationId, searchQuery, stateFilter, pageIndex, pageSize, sortField, sortDirection]);

  // ---- Row selection ----
  const [selectedCustomerIds, setSelectedCustomerIds] = React.useState<Set<string>>(new Set());

  const isSelected = (id: string) => selectedCustomerIds.has(id);
  const someSelected = selectedCustomerIds.size > 0 && selectedCustomerIds.size < customers.length;
  const allSelected = customers.length > 0 && selectedCustomerIds.size === customers.length;

  const handleSelectCustomer = (id: string, checked: boolean) => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCustomerIds(new Set(customers.map((c) => c.id)));
    } else {
      setSelectedCustomerIds(new Set());
    }
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col px-4 py-6 sm:px-8 sm:py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#e7e5e4] rounded w-1/4" />
          <div className="h-64 bg-[#e7e5e4] rounded" />
        </div>
      </div>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col px-4 py-6 sm:px-8 sm:py-10">
        <Card className="overflow-hidden border rounded-xl bg-[#ffffff]">
          <CardContent className="py-8 text-center">
            <p className="text-body">{error}</p>
            <Button onClick={() => router.refresh()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Empty state ----
  if (customers.length === 0 && !loading && !error) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col px-4 py-6 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-4">
          {/* Header bar */}
          <div className="flex items-center gap-4">
            <Link
              href="/customers"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f4f3f5] text-[#202223] transition-colors hover:bg-[#e7e5e4]"
              aria-label="Back to Customers"
            >
              <Search className="size-4" />
            </Link>
            <h1 className="text-[22px] font-semibold leading-7 tracking-[-0.02em] text-[#202223]">
              Customers
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Export
            </Button>
            <Button variant="outline" size="sm">
              Import
            </Button>
            {canCreate && (
              <Link href="/customers/new">
                <Button size="sm">
                  <Plus className="size-4 mr-2" />
                  Add customer
                </Button>
              </Link>
            )}
          </div>
        </div>

        <Separator className="my-4" />

        {/* Segment filter */}
        <div className="relative flex-1 min-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9ca3af]" />
          <Input
            type="text"
            placeholder="Describe your segment"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Separator className="my-4" />

        <Card className="overflow-hidden border rounded-xl bg-[#ffffff]">
          <CardContent className="px-6 py-4">
            <Empty className="border-0 p-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Plus className="size-12 text-[#9ca3af]" />
                </EmptyMedia>
                <EmptyTitle className="text-[#202223]">No customers found</EmptyTitle>
                <EmptyDescription className="text-[#6b7280]">
                  {searchQuery || stateFilter !== "all"
                    ? "Try adjusting your search or filters."
                    : "Get started by adding your first customer."}
                </EmptyDescription>
              </EmptyHeader>
              {canCreate && !searchQuery && stateFilter === "all" && (
                <EmptyContent>
                  <Link href="/customers/new">
                    <Button size="sm">
                      <Plus className="size-4 mr-2" />
                      Add customer
                    </Button>
                  </Link>
                </EmptyContent>
              )}
            </Empty>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col px-4 py-6 sm:px-8 sm:py-10">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/customers"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f4f3f5] text-[#202223] transition-colors hover:bg-[#e7e5e4]"
            aria-label="Back to Customers"
          >
            <Search className="size-4" />
          </Link>
          <h1 className="text-[22px] font-semibold leading-7 tracking-[-0.02em] text-[#202223]">
            Customers
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Export
          </Button>
          <Button variant="outline" size="sm">
            Import
          </Button>
          {canCreate && (
            <Link href="/customers/new">
              <Button size="sm">
                <Plus className="size-4 mr-2" />
                Add customer
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Separator className="my-4" />

      {/* Segment filter */}
      <div className="relative flex-1 min-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9ca3af]" />
        <Input
          type="text"
          placeholder="Describe your segment"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Separator className="my-4" />

      {/* Customer Table */}
      <Card className="overflow-hidden border rounded-xl bg-[#ffffff]">
        <CardContent className="p-0 pt-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f3f5]">
                <TableHead className="h-12 px-6 text-[11px] font-medium text-[#6b7280]">
                  <Checkbox
                    checked={allSelected || someSelected}
                    onCheckedChange={handleSelectAll}
                    className="rounded border-[#e7e5e4] text-[#0e7c7b] focus:ring-[#0e7c7b]"
                  />
                </TableHead>
                <TableHead className="h-12 px-6 text-left text-[11px] font-medium text-[#6b7280]">
                  Customer name
                </TableHead>
                <TableHead className="h-12 px-6 text-left text-[11px] font-medium text-[#6b7280]">
                  Email subscription
                </TableHead>
                <TableHead className="h-12 px-6 text-left text-[11px] font-medium text-[#6b7280]">
                  Location
                </TableHead>
                <TableHead className="h-12 px-6 text-right text-[11px] font-medium text-[#6b7280]">
                  Orders
                </TableHead>
                <TableHead className="h-12 px-6 text-right text-[11px] font-medium text-[#6b7280]">
                  Amount spent
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="hover:bg-[#f4f3f5]/50 transition-colors group"
                >
                  <TableCell className="px-6 py-4">
                    <Checkbox
                      checked={isSelected(customer.id)}
                      onCheckedChange={(checked) => handleSelectCustomer(customer.id, checked)}
                      className="rounded border-[#e7e5e4] text-[#0e7c7b] focus:ring-[#0e7c7b]"
                    />
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex shrink-0 items-center justify-center w-6 h-6 rounded-full bg-[#e7e5e4] text-[10px] font-medium text-[#6b7280]">
                        {initials(customer)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[#202223] font-medium truncate">
                          {customerDisplayName(customer)}
                        </div>
                        <div className="text-[11px] text-[#6b7280] truncate">
                          {customer.email ?? "—"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Checkbox
                      defaultChecked={customer.accepts_marketing}
                      onCheckedChange={() => {}}
                      className="rounded border-[#e7e5e4] text-[#6b7280] focus:ring-[#6b7280]"
                    >
                      {customer.accepts_marketing ? "Subscribed" : "Not subscribed"}
                    </Checkbox>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-[#6b7280]">
                    India
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right text-[#202223]">
                    {customer.orders_count}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right text-[#202223] font-medium">
                    {formatCurrency(Number(customer.total_spent || 0))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination */}
        {total > 0 && (
          <CardFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-[#f4f3f5]">
            <div className="flex items-center gap-2 text-[11px] text-[#6b7280]">
              <span>
                {Math.min(pageIndex * pageSize + 1, total)}
                -{" "}
                {Math.min((pageIndex + 1) * pageSize, total)}
                of {total}
              </span>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
