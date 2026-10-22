"use client";

import * as React from "react";
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
  type PaginationState,
  type RowData,
} from "@tanstack/react-table";
import { IconArrowsSort, IconChevronLeft, IconChevronRight, IconColumns3, IconSearch } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageState } from "@/components/studio/page-state";

export type OrderStatus = "pending" | "confirmed" | "fulfilling" | "shipped" | "completed" | "cancelled";
export type StoreOrder = {
  id: string; order_number: string; customer_name: string; customer_email: string; customer_phone: string;
  items: { productId: string; title: string; quantity: number; price: number }[];
  status: OrderStatus; payment_status: string; payment_method: string; total: number; currency: string; created_at: string;
};

const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
});
type OrdersTableFeatures = typeof features;
const statuses: OrderStatus[] = ["pending", "confirmed", "fulfilling", "shipped", "completed", "cancelled"];
const column = createColumnHelper<OrdersTableFeatures, StoreOrder>();
const money = (amount: number, currency: string) => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(amount); }
  catch { return `${currency || "USD"} ${amount.toFixed(2)}`; }
};
const orderColumns = column.columns([
  column.display({
    id: "select",
    header: ({ table }) => <Checkbox aria-label="Select all orders on this page" checked={table.getIsAllPageRowsSelected()} onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked === true)} />,
    cell: ({ row }) => <Checkbox aria-label={`Select order ${row.original.order_number}`} checked={row.getIsSelected()} onCheckedChange={(checked) => row.toggleSelected(checked === true)} />,
    enableSorting: false,
    enableHiding: false,
  }),
  column.accessor("order_number", {
    header: ({ column }) => <SortHeader column={column} label="Order" />,
    cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
    filterFn: "includesString",
    sortFn: "alphanumeric",
  }),
  column.accessor("created_at", {
    header: ({ column }) => <SortHeader column={column} label="Date" />,
    cell: ({ getValue }) => <span className="whitespace-nowrap text-muted-foreground">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(getValue()))}</span>,
    sortFn: "text",
  }),
  column.accessor("customer_name", {
    header: ({ column }) => <SortHeader column={column} label="Customer" />,
    cell: ({ row }) => <div className="min-w-36"><p className="font-medium">{row.original.customer_name}</p><p className="text-xs text-muted-foreground">{row.original.customer_email}</p></div>,
    filterFn: "includesString",
  }),
  column.accessor((order) => order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0, {
    id: "items",
    header: "Items",
    cell: ({ getValue }) => <span>{getValue()} {getValue() === 1 ? "item" : "items"}</span>,
    enableSorting: false,
  }),
  column.accessor("total", {
    header: ({ column }) => <SortHeader column={column} label="Total" />,
    cell: ({ row }) => <span className="font-medium tabular-nums">{money(row.original.total, row.original.currency)}</span>,
    sortFn: "alphanumeric",
  }),
  column.accessor("payment_status", {
    header: "Payment status",
    cell: ({ getValue }) => <Badge variant={getValue() === "paid" ? "default" : getValue() === "refunded" ? "destructive" : "secondary"} className="capitalize">{getValue()}</Badge>,
    filterFn: "includesString",
  }),
  column.accessor("status", {
    header: "Fulfillment status",
    cell: ({ row, table }) => {
      const value = row.original.status;
      return <Select value={value} onValueChange={(next) => next && (table.options.meta as OrdersTableMeta | undefined)?.onStatusChange(row.original, next as OrderStatus)}>
        <SelectTrigger className="h-8 w-36 capitalize" aria-label={`Status for order ${row.original.order_number}`}><SelectValue /></SelectTrigger>
        <SelectContent>{statuses.map((status) => <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>)}</SelectContent>
      </Select>;
    },
    filterFn: "includesString",
  }),
  column.accessor((order) => `${order.order_number} ${order.customer_name} ${order.customer_email}`.toLowerCase(), {
    id: "search",
    header: "Search index",
    enableHiding: true,
    enableSorting: false,
    filterFn: "includesString",
  }),
]);

type OrdersTableMeta = { onStatusChange: (order: StoreOrder, status: OrderStatus) => void };
function SortHeader({ column, label }: { column: { toggleSorting: (descending?: boolean) => void; getIsSorted: () => false | "asc" | "desc" }; label: string }) {
  return <Button variant="ghost" size="sm" className="-ml-3 h-8 px-3 font-medium" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
    {label}<IconArrowsSort className="ml-2 size-3.5 text-muted-foreground" />
  </Button>;
}

export function OrdersDataTable({ data, loading, onStatusChange, onBulkStatusChange }: {
  data: StoreOrder[];
  loading: boolean;
  onStatusChange: (order: StoreOrder, status: OrderStatus) => void;
  onBulkStatusChange: (ids: string[], status: OrderStatus) => void;
}) {
  const [search, setSearch] = React.useState("");
  const [paymentFilter, setPaymentFilter] = React.useState("all");
  const [bulkStatus, setBulkStatus] = React.useState<OrderStatus | "">("");
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const table = useTable({
    features,
    data,
    columns: orderColumns,
    getRowId: (row: StoreOrder) => row.id,
    meta: { onStatusChange },
    initialState: { columnVisibility: { search: false } },
    state: { pagination },
    onPaginationChange: setPagination,
  });
  const selectedRows = table.getSelectedRowModel().rows;
  const rowCount = table.getFilteredRowModel().rows.length;

  function setQuery(value: string) {
    setSearch(value);
    table.getColumn("search")?.setFilterValue(value);
    table.setPageIndex(0);
  }

  return <div className="flex min-h-0 flex-1 flex-col gap-3">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative min-w-52 flex-1"><IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search orders" value={search} onChange={(event) => setQuery(event.target.value)} placeholder="Search orders, customers, or email" className="pl-9" /></div>
      <Select value={paymentFilter} onValueChange={(value) => { const next = value ?? "all"; setPaymentFilter(next); table.getColumn("payment_status")?.setFilterValue(next === "all" ? "" : next); table.setPageIndex(0); }}><SelectTrigger aria-label="Filter by payment status" className="w-full sm:w-44"><SelectValue>{paymentFilter === "all" ? "All payments" : paymentFilter}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">All payments</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem><SelectItem value="refunded">Refunded</SelectItem></SelectContent></Select>
      <DropdownMenu><DropdownMenuTrigger render={<Button variant="outline" className="sm:ml-auto"><IconColumns3 />Columns</Button>}><span className="sr-only">Toggle columns</span></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Show columns</DropdownMenuLabel><DropdownMenuSeparator />{table.getAllColumns().filter((col) => col.getCanHide() && col.id !== "search").map((col) => <DropdownMenuCheckboxItem key={col.id} checked={col.getIsVisible()} onCheckedChange={(visible) => col.toggleVisibility(visible)} className="capitalize">{col.id.replaceAll("_", " ")}</DropdownMenuCheckboxItem>)}</DropdownMenuContent></DropdownMenu>
    </div>
    {selectedRows.length > 0 && <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3"><span className="mr-auto text-sm font-medium">{selectedRows.length} selected</span><Select value={bulkStatus} onValueChange={(value) => setBulkStatus((value ?? "") as OrderStatus | "")}><SelectTrigger className="w-44" aria-label="Choose status for selected orders"><SelectValue>{bulkStatus ? `Set ${bulkStatus}` : "Change status to…"}</SelectValue></SelectTrigger><SelectContent>{statuses.map((status) => <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>)}</SelectContent></Select><Button size="sm" disabled={!bulkStatus} onClick={() => { if (bulkStatus) onBulkStatusChange(selectedRows.map((row) => row.original.id), bulkStatus); table.resetRowSelection(); setBulkStatus(""); }}>Apply</Button><Button size="sm" variant="ghost" onClick={() => table.resetRowSelection()}>Clear</Button></div>}
    <div className="min-h-0 flex-1 overflow-hidden rounded-lg border">
      <Table className="min-w-[1000px]" style={{ width: "100%" }}>
        <TableHeader className="bg-muted/40">{table.getHeaderGroups().map((group) => <TableRow key={group.id}>{group.headers.map((header) => <TableHead key={header.id} className={header.column.id === "select" ? "w-10" : undefined}>{header.isPlaceholder ? null : <table.FlexRender header={header} />}</TableHead>)}</TableRow>)}</TableHeader>
        <TableBody>{loading ? <TableRow><TableCell colSpan={table.getVisibleLeafColumns().length} className="p-0"><PageState kind="loading" title="Loading orders" description="Fetching the latest customer orders." className="min-h-32 border-0 rounded-none py-5" /></TableCell></TableRow> : table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id}><table.FlexRender cell={cell} /></TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={table.getVisibleLeafColumns().length} className="p-0"><PageState kind="empty" title="No orders match this view" description="Try another search or payment filter." className="min-h-40 border-0 rounded-none py-5" /></TableCell></TableRow>}</TableBody>
      </Table>
    </div>
    <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">{selectedRows.length} of {rowCount} row(s) selected</p>
      <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm text-muted-foreground">Rows per page<Select value={String(pagination.pageSize)} onValueChange={(value) => table.setPageSize(Number(value ?? 10))}><SelectTrigger className="h-8 w-[72px]" aria-label="Rows per page"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="20">20</SelectItem><SelectItem value="50">50</SelectItem></SelectContent></Select></label><span className="text-sm font-medium">Page {pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}</span><div className="flex gap-1"><Button variant="outline" size="icon" aria-label="Previous page" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}><IconChevronLeft /></Button><Button variant="outline" size="icon" aria-label="Next page" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}><IconChevronRight /></Button></div></div>
    </div>
  </div>;
}
