"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
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
} from "@tanstack/react-table";
import {
  IconArrowsSort,
  IconArchive,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconColumns3,
  IconEdit,
  IconPackage,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { PageState } from "@/components/studio/page-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type StoreProduct = {
  id: string;
  category_id: string | null;
  subcategory_id: string | null;
  design_origin: "original_zerocraft" | "licensed" | "fan_inspired";
  rights_status: "not_applicable" | "approved_license" | "review_required";
  title: string;
  slug: string;
  description: string;
  product_type: "physical" | "digital";
  status: "draft" | "active" | "archived";
  sku: string;
  price: number;
  compare_at_price: number | null;
  currency: string;
  stock: number | null;
  image_url: string;
  store_product_media?: {
    id: string;
    storage_path: string;
    public_url: string;
    alt_text: string;
    sort_order: number;
    media_type: "image" | "video" | "document";
    is_primary: boolean;
  }[];
  store_product_variants: {
    id?: string;
    label: string;
    sku: string;
    options: Record<string, string>;
    price: number;
    stock: number | null;
    is_active: boolean;
    store_inventory_levels?: {
      location_id: string;
      on_hand: number;
      reserved: number;
    }[];
  }[];
};

type Category = { id: string; name: string };
type TableMeta = {
  categories: Category[];
  canManageCatalog: boolean;
  onEdit: (product: StoreProduct) => void;
  onDelete: (product: StoreProduct) => void;
  onBulkStatus?: (
    products: StoreProduct[],
    status: "active" | "archived",
  ) => void;
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
type ProductTableFeatures = typeof features;
const column = createColumnHelper<ProductTableFeatures, StoreProduct>();

const money = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  } catch {
    return `${currency || "USD"} ${amount.toFixed(2)}`;
  }
};

function availableStock(product: StoreProduct) {
  if (product.product_type === "digital") return null;
  if (!product.store_product_variants?.length) return product.stock;
  return product.store_product_variants.reduce((total, variant) => {
    const levels = variant.store_inventory_levels ?? [];
    return total + (levels.length
      ? levels.reduce((sum, level) => sum + Math.max(0, level.on_hand - level.reserved), 0)
      : variant.stock ?? 0);
  }, 0);
}

const productColumns = column.columns([
  column.display({
    id: "select",
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all products on this page"
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(checked) =>
          table.toggleAllPageRowsSelected(checked === true)
        }
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Select ${row.original.title}`}
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(checked === true)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  }),
  column.accessor("title", {
    header: ({ column }) => <SortHeader column={column} label="Product" />,
    cell: ({ row, table }) => {
      const meta = table.options.meta as TableMeta;
      return (
        <div className="flex min-w-52 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted text-muted-foreground">
            {row.original.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.original.image_url}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <IconPackage className="size-4" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              SKU {row.original.sku || "—"}
            </p>
          </div>
        </div>
      );
    },
    filterFn: "includesString",
    sortFn: "text",
  }),
  column.accessor("category_id", {
    id: "category",
    header: "Category",
    cell: ({ row, table }) => {
      const meta = table.options.meta as TableMeta;
      if (!meta.canManageCatalog) return null;
      return (
        <span className="text-muted-foreground">
          {meta.categories.find((item) => item.id === row.original.category_id)
            ?.name || "Uncategorized"}
        </span>
      );
    },
    enableSorting: false,
  }),
  column.accessor("product_type", {
    header: "Type",
    cell: ({ getValue }) => (
      <Badge variant="outline" className="capitalize">
        {getValue()}
      </Badge>
    ),
    filterFn: "includesString",
  }),
  column.accessor("status", {
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue();
      return (
        <Badge
          variant={status === "active" ? "default" : "secondary"}
          className="capitalize"
        >
          {status}
        </Badge>
      );
    },
    filterFn: "includesString",
  }),
  column.accessor("price", {
    header: ({ column }) => <SortHeader column={column} label="Price" />,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {money(Number(row.original.price), row.original.currency)}
      </span>
    ),
    sortFn: "alphanumeric",
  }),
  column.accessor("stock", {
    header: ({ column }) => <SortHeader column={column} label="Inventory" />,
    cell: ({ row }) => {
      const product = row.original;
      const stock = product.store_product_variants?.length
        ? product.store_product_variants.reduce(
            (total, variant) => total + (variant.store_inventory_levels?.length
              ? variant.store_inventory_levels.reduce((sum, level) => sum + Math.max(0, level.on_hand - level.reserved), 0)
              : variant.stock ?? 0),
            0,
          )
        : product.stock;
      return product.product_type === "digital" ? (
        <span className="text-muted-foreground">Unlimited</span>
      ) : (
        <span className="tabular-nums">{stock ?? "Not tracked"}</span>
      );
    },
    sortFn: "alphanumeric",
  }),
  column.accessor(
    (product) =>
      `${product.title} ${product.sku} ${product.slug}`.toLowerCase(),
    {
      id: "search",
      header: "Search index",
      enableHiding: true,
      enableSorting: false,
      filterFn: "includesString",
    },
  ),
  column.display({
    id: "actions",
    header: "",
    cell: ({ row, table }) => {
      const meta = table.options.meta as TableMeta;
      if (!meta.canManageCatalog) return null;
      return (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`Edit ${row.original.title}`}
            onClick={() => meta.onEdit(row.original)}
          >
            <IconEdit />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`Delete ${row.original.title}`}
            onClick={() => meta.onDelete(row.original)}
          >
            <IconTrash />
          </Button>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  }),
]);

function SortHeader({
  column,
  label,
}: {
  column: {
    toggleSorting: (descending?: boolean) => void;
    getIsSorted: () => false | "asc" | "desc";
  };
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 px-3 font-medium"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      <IconArrowsSort className="ml-2 size-3.5 text-muted-foreground" />
    </Button>
  );
}

export function StoreProductsDataTable({
  data,
  categories,
  canManageCatalog,
  healthFilter = "all",
  healthSlugs = [],
  onClearHealthFilter,
  loading,
  configured,
  onEdit,
  onDelete,
  onBulkStatus,
}: {
  data: StoreProduct[];
  categories: Category[];
  canManageCatalog: boolean;
  healthFilter?: string;
  healthSlugs?: string[];
  onClearHealthFilter?: () => void;
  loading: boolean;
  configured: boolean;
  onEdit: (product: StoreProduct) => void;
  onDelete: (product: StoreProduct) => void;
  onBulkStatus?: (
    products: StoreProduct[],
    status: "active" | "archived",
  ) => void;
}) {
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const tableRef = React.useRef<HTMLDivElement>(null);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 6,
  });
  const healthFilteredData = healthFilter === "all"
    ? data
    : data.filter((product) => healthSlugs.includes(product.slug));
  const visibleData =
    categoryFilter === "all"
      ? healthFilteredData
      : healthFilteredData.filter((product) => product.category_id === categoryFilter);
  const table = useTable({
    features,
    data: visibleData,
    columns: productColumns,
    getRowId: (product: StoreProduct) => product.id,
    meta: { categories, canManageCatalog, onEdit, onDelete, onBulkStatus },
    initialState: { columnVisibility: { search: false } },
    state: { pagination },
    onPaginationChange: setPagination,
  });

  function setQuery(value: string) {
    setSearch(value);
    table.getColumn("search")?.setFilterValue(value);
    table.setPageIndex(0);
  }

  function setType(value: string) {
    setTypeFilter(value);
    table
      .getColumn("product_type")
      ?.setFilterValue(value === "all" ? "" : value);
    table.setPageIndex(0);
  }

  function setStatus(value: string) {
    setStatusFilter(value);
    table.getColumn("status")?.setFilterValue(value === "all" ? "" : value);
    table.setPageIndex(0);
  }

  function setCategory(value: string) {
    setCategoryFilter(value);
    table.setPageIndex(0);
  }

  React.useLayoutEffect(() => {
    const rows = tableRef.current?.querySelectorAll("[data-product-row]");
    if (!rows?.length) return;
    gsap.fromTo(
      rows,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.28, stagger: 0.035, ease: "power2.out" },
    );
  }, [
    pagination.pageIndex,
    search,
    typeFilter,
    statusFilter,
    categoryFilter,
    visibleData.length,
  ]);

  const selectedCount = table.getSelectedRowModel().rows.length;
  const rowCount = table.getFilteredRowModel().rows.length;
  const bulkBarRef = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    if (!bulkBarRef.current || selectedCount === 0) return;
    gsap.fromTo(
      bulkBarRef.current,
      { autoAlpha: 0, y: 20 },
      { autoAlpha: 1, y: 0, duration: 0.32, ease: "power3.out" },
    );
  }, [selectedCount]);
  const activeCount = data.filter(
    (product) => product.status === "active",
  ).length;
  const lowInventoryCount = data.filter((product) => {
    if (product.product_type !== "physical") return false;
    const stock = availableStock(product);
    return stock !== null && stock <= 5;
  }).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <section
        className="grid overflow-hidden rounded-xl border border-border/80 bg-card sm:grid-cols-3"
        aria-label="Product summary"
      >
        {[
          { label: "Products", value: data.length, note: "Across the catalog" },
          {
            label: "Active listings",
            value: activeCount,
            note: "Available to customers",
          },
          {
            label: "Low inventory",
            value: lowInventoryCount,
            note: "Five or fewer units",
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="border-b border-border/70 px-4 py-3 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
          >
            <p className="text-sm text-muted-foreground">{metric.label}</p>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <p className="text-2xl font-semibold tabular-nums">
                {configured ? metric.value : "—"}
              </p>
              <span className="text-xs text-muted-foreground">
                {metric.note}
              </span>
            </div>
          </div>
        ))}
      </section>
      <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card p-2.5 xl:flex-row xl:items-center">
        <Tabs value={typeFilter} onValueChange={setType}>
          <TabsList className="h-9">
            <TabsTrigger value="all">All products</TabsTrigger>
            <TabsTrigger value="physical">Physical</TabsTrigger>
            <TabsTrigger value="digital">Digital</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative min-w-52 flex-1">
            <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search products"
              value={search}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products, SKU, or slug"
              className="pl-9"
            />
          </div>
          <Select
            value={categoryFilter}
            onValueChange={(value) => setCategory(value ?? "all")}
          >
            <SelectTrigger
              className="w-full sm:w-44"
              aria-label="Filter by category"
            >
              <SelectValue>
                {categoryFilter === "all"
                  ? "All categories"
                  : categories.find(
                      (category) => category.id === categoryFilter,
                    )?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatus(value ?? "all")}
            
          >
            <SelectTrigger
              className="w-full sm:w-40"
              aria-label="Filter by product status"
              
            >
              <SelectValue>
                {statusFilter === "all" ? "All statuses" : statusFilter}
              </SelectValue>
            </SelectTrigger>
            <SelectContent side="bottom">
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button type="button" variant="outline">
                  <IconColumns3 /> Columns
                </Button>
              }
            >
              <span className="sr-only">Toggle product columns</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Show columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((col) => col.getCanHide() && col.id !== "search")
                .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={col.getIsVisible()}
                    onCheckedChange={(visible) => col.toggleVisibility(visible)}
                    className="capitalize"
                  >
                    {col.id.replaceAll("_", " ")}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {canManageCatalog && selectedCount > 0 && (
        <div
          ref={bulkBarRef}
          role="toolbar"
          aria-label="Selected product actions"
          className="fixed bottom-25 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 flex-wrap items-center gap-2 rounded-2xl border border-border bg-background/95 px-3 py-2.5 shadow-2xl backdrop-blur-xl sm:w-auto sm:px-4"
        >
          <span className="mr-2 text-sm font-medium">
            {selectedCount} selected
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() =>
              onBulkStatus?.(
                table.getSelectedRowModel().rows.map((row) => row.original),
                "active",
              )
            }
          >
            <IconCheck className="size-3.5" /> Mark active
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() =>
              onBulkStatus?.(
                table.getSelectedRowModel().rows.map((row) => row.original),
                "archived",
              )
            }
          >
            <IconArchive className="size-3.5" /> Archive
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="ml-auto"
            size="icon-sm"
            aria-label="Clear product selection"
            onClick={() => table.resetRowSelection()}
          >
            <IconX className="size-4" />
          </Button>
        </div>
      )}

      <div
        ref={tableRef}
        className="min-h-0 overflow-x-auto rounded-xl border border-border bg-card"
      >
        <Table className="min-w-[900px]" style={{ width: "100%" }}>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={
                      header.column.id === "select" ? "w-10" : undefined
                    }
                  >
                    {header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-32 text-center text-muted-foreground"
                >
                  <PageState kind="loading" title="Loading products" description="Fetching the latest catalog inventory." className="min-h-28 border-0 rounded-none py-5" />
                </TableCell>
              </TableRow>
            ) : !configured ? (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-40 text-center"
                >
                  <PageState kind="error" title="Catalog setup required" description="Apply the catalog migration to begin managing store products." className="min-h-36 border-0 rounded-none py-5" />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-product-row
                  data-state={row.getIsSelected() ? "selected" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-28 text-center"
                >
                  <PageState kind="empty" title={data.length ? "No products match this view" : "No products yet"} description={data.length ? "Try another search or filter." : "Add your first product to get started."} className="min-h-28 border-0 rounded-none py-5" />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {selectedCount} of {rowCount} row(s) selected
        </p>
        {rowCount > pagination.pageSize && (
      <div className="flex flex-wrap items-center gap-3">
        {healthFilter !== "all" && <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200"><span>Readiness filter: {healthFilter.replaceAll("_", " ")}</span><Button type="button" size="sm" variant="ghost" onClick={onClearHealthFilter}>Clear</Button></div>}
            <span className="text-sm font-medium">
              Page {pagination.pageIndex + 1} of{" "}
              {Math.max(table.getPageCount(), 1)}
            </span>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Previous page"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
              >
                <IconChevronLeft />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Next page"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
              >
                <IconChevronRight />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
