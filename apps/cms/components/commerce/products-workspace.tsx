"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  IconTag,
  IconSearch,
  IconLayoutColumns,
  IconChevronDown,
  IconSelector,
  IconDots,
  IconCalendar,
  IconEye,
  IconArchive,
  IconEyeOff,
  IconTrash,
  IconPlus,
  IconPackage,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@zerocraft/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@zerocraft/components/ui/select";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@zerocraft/components/ui/pagination"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@zerocraft/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@zerocraft/components/ui/dialog";
import { Button } from "@zerocraft/components/ui/button";
import { Badge } from "@zerocraft/components/ui/badge";
import { Input } from "@zerocraft/components/ui/input";
import { Checkbox } from "@zerocraft/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zerocraft/components/ui/table";
import { formatRecordedMoney } from "@/lib/currency";
import { useCurrency } from "@/lib/currency-context";
import { ProductTransfer } from "./product-transfer";
import { CommercePageHeader } from "./commerce-page-header";
import { Label } from "@zerocraft/components/ui/label";
import { cn } from "@zerocraft/lib/cn";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@zerocraft/components/ui/popover";
type Product = {
  id: string;
  title: string;
  slug: string;
  sku: string;
  status: string;
  image_url: string;
  category_id: string | null;
  price: number;
  currency: string;
  stock: number | null;
  product_type: string;
  vendor: string;
  merchandise_type: string;
  tags: string[];
  sales_channels: string[];
  catalogs: string[];
  is_listed: boolean;
  deleted_at: string | null;
  variants: {
    id: string;
    stock: number | null;
    is_active: boolean;
    inventory_levels?: { on_hand: number; reserved: number }[];
  }[];
  collection_products: { collection_id: string }[];
  [key: string]: unknown;
};
type Metric = {
  id: string;
  title: string;
  stock: number | null;
  units: number;
  revenue: number;
  grade: string;
  sellThrough: number | null;
  daysRemaining: number | null;
};
type Payload = {
  products: Product[];
  categories: { id: string; name: string }[];
  collections: { id: string; name: string }[];
  canManage: boolean;
  analytics: {
    sellThrough: number | null;
    daysRemaining: number | null;
    cRevenue: number;
    products: Metric[];
  } | null;
  analyticsError: string | null;
};
type Action = { key: string; title: string; description?: string };
const channels = [
  { id: "online_store", name: "Online Store" },
  { id: "point_of_sale", name: "Point of Sale" },
];
const classes = {
  workspace:
    "w-full min-w-0 bg-white pb-12 text-[13px] text-neutral-900 max-md:pb-10",
  primary:
    "h-[30px] rounded-full border border-neutral-700 bg-gradient-to-b from-neutral-700 to-neutral-900 px-3 text-xs font-semibold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,.2),0_1px_3px_rgba(0,0,0,.2)] hover:from-neutral-600 hover:to-neutral-800",
  metrics:
    "mb-3 grid min-h-[70px] max-w-[1500px] grid-cols-[128px_repeat(4,minmax(150px,1fr))] items-center max-md:grid-cols-[90px_repeat(4,minmax(170px,1fr))] max-md:overflow-x-auto",
  metric:
    "grid gap-1.5 border-0 bg-transparent px-5 py-3 text-left text-[13px] max-md:px-3",
  menuButton:
    "inline-flex min-h-7 items-center justify-center gap-1.5 rounded-lg border-0 bg-transparent px-2 py-1.5 text-[13px] hover:bg-neutral-100",
  iconButton:
    "inline-flex min-h-7 items-center justify-center gap-1.5 rounded-lg border-0 bg-transparent px-2 py-1.5 text-[13px] hover:bg-neutral-100",
  menu: "min-w-[190px] rounded-2xl p-1 text-[13px] shadow-lg [&_[data-slot=dropdown-menu-item]]:min-h-8 [&_[data-slot=dropdown-menu-item]]:rounded-lg [&_[data-slot=dropdown-menu-item]]:text-[13px]",
  periodOption: "items-start gap-2 p-2",
  filterBar:
    "mb-2 flex h-[39px] items-center rounded-xl border border-neutral-200 px-1.5 shadow-sm",
  search: "flex min-w-0 flex-1 items-center gap-2 px-1.5",
  filters: "flex flex-wrap items-end gap-3 py-2 pb-3",
  bulkBar:
    "mb-px flex min-h-8 flex-wrap items-center gap-1 rounded-lg bg-neutral-100 px-3 py-0.5",
  tableWrap: "w-full overflow-x-auto",
  table:
    "w-full min-w-[1000px] border-separate border-spacing-0 text-left text-[13px] [&_th]:h-8 [&_th]:whitespace-nowrap [&_th]:bg-neutral-50 [&_th]:px-3 [&_th]:py-1 [&_th]:text-xs [&_th]:font-normal [&_td]:h-[49px] [&_td]:whitespace-nowrap [&_td]:border-b [&_td]:border-neutral-100 [&_td]:px-3 [&_td]:py-1.5 [&_tbody_tr:hover]:bg-neutral-50",
  productLink:
    "flex cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left font-inherit hover:underline",
  productName:
    "grid min-w-0 gap-0.5 [&_strong]:max-w-[34vw] [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_small]:text-[11px] [&_small]:text-neutral-500",
  thumbnail:
    "grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 text-neutral-500 [&_img]:size-full [&_img]:object-cover",
  badge:
    "inline-block rounded-md bg-neutral-100 px-1.5 py-0.5 text-xs leading-[17px] text-neutral-700",
  active: "bg-lime-200 text-lime-950",
  low: "text-red-700",
  selected: "bg-neutral-100",
  empty:
    "mt-2 rounded-lg border border-dashed border-neutral-300 px-5 py-12 text-center text-neutral-500",
  pagination: "mt-3 flex items-center justify-center gap-2 text-xs",
  learn:
    "mx-auto mt-7 block border-0 bg-transparent font-inherit hover:underline",
  optionList: "grid max-h-80 gap-3 overflow-auto",
  editTable:
    "max-h-[60vh] overflow-auto [&_table]:w-full [&_table]:border-collapse [&_td]:border-b [&_td]:border-neutral-200 [&_td]:p-2 [&_th]:bg-neutral-50 [&_th]:p-2 [&_th]:text-left [&_th]:font-medium",
  editDialog: "w-[calc(100vw-2rem)] max-w-[900px]",
  error:
    "my-2 flex items-center justify-between rounded-lg bg-red-50 px-3.5 py-2.5 text-red-800",
  notice:
    "my-2 flex items-center justify-between rounded-lg bg-green-50 px-3.5 py-2.5 text-green-900",
  hiddenHead: "absolute h-px w-px overflow-hidden [clip-path:inset(50%)]",
};
const initialColumns = [
  "status",
  "inventory",
  "category",
  "channels",
  "type",
  "vendor",
];
const columnLabels: Record<string, string> = {
  status: "Status",
  inventory: "Inventory",
  category: "Category",
  channels: "Channels",
  type: "Product type",
  vendor: "Vendor",
  price: "Price",
  tags: "Tags",
  catalogs: "Catalogs",
};
const bulkActions = [
  { key: "status:active", title: "Set products as active" },
  { key: "status:draft", title: "Set products as draft" },
  { key: "status:archived", title: "Archive products", icon: IconArchive },
  { key: "unlist", title: "Unlist products", icon: IconEyeOff },
  { key: "list", title: "List products", icon: IconEye },
  { key: "delete", title: "Delete products", icon: IconTrash },
  { key: "include_channels", title: "Include in sales channels" },
  { key: "exclude_channels", title: "Exclude from sales channels" },
  { key: "include_catalogs", title: "Include in catalogs" },
  { key: "exclude_catalogs", title: "Exclude from catalogs" },
  { key: "add_tags", title: "Add tags" },
  { key: "remove_tags", title: "Remove tags" },
  { key: "add_collections", title: "Add to collection(s)" },
  { key: "remove_collections", title: "Remove from collection(s)" },
];
function stockOf(product: Product) {
  if (product.product_type === "digital") return null;
  const variants = product.variants.filter((v) => v.is_active);
  return variants.length
    ? variants.reduce(
        (sum, v) =>
          sum +
          (v.inventory_levels?.length
            ? v.inventory_levels.reduce(
                (n, l) => n + Math.max(0, l.on_hand - l.reserved),
                0,
              )
            : (v.stock ?? 0)),
        0,
      )
    : product.stock;
}
function Thumbnail({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={classes.thumbnail}>
      {src && !failed ? (
        <img src={src} alt="" onError={() => setFailed(true)} />
      ) : (
        <IconPackage size={17} />
      )}
    </span>
  );
}
function Menu({
  label,
  children,
  iconOnly = false,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  iconOnly?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={iconOnly ? classes.iconButton : classes.menuButton}
          />
        }
      >
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={classes.menu}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function ProductsWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const { currency, formatAmount } = useCurrency();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [days, setDays] = useState(30);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [category, setCategory] = useState("");
  const [vendor, setVendor] = useState("");
  const [tag, setTag] = useState("");
  const [channel, setChannel] = useState("");
  const [inventory, setInventory] = useState("");
  const [filters, setFilters] = useState(false);
  const [sort, setSort] = useState("title");
  const [ascending, setAscending] = useState(true);
  const [grid, setGrid] = useState(false);
  const [columns, setColumns] = useState(initialColumns);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [action, setAction] = useState<Action | null>(null);
  const [values, setValues] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [edits, setEdits] = useState<
    { id: string; title: string; vendor: string; merchandise_type: string }[]
  >([]);
  const [report, setReport] = useState<string | null>(null);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/store/products?days=${days}&currency=${currency}`,
          { signal, cache: "no-store" },
        );
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Products could not be loaded.");
        setPayload(result);
        setError("");
        setSelected((previous) =>
          previous.filter((id) =>
            result.products.some((p: Product) => p.id === id),
          ),
        );
      } catch (failure) {
        if (!(failure instanceof DOMException && failure.name === "AbortError"))
          setError(
            failure instanceof Error
              ? failure.message
              : "Products could not be loaded.",
          );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [days, currency],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  useEffect(() => {
    setPage(0);
  }, [query, status, category, vendor, tag, selectedOnly, pageSize]);
  const products = payload?.products ?? [];
  const visible = useMemo(
    () =>
      products
        .filter(
          (p) =>
            (!selectedOnly || selected.includes(p.id)) &&
            (status === "All" || p.status === status.toLowerCase()) &&
            (!category || p.category_id === category) &&
            (!vendor || p.vendor === vendor) &&
            (!tag || p.tags.includes(tag)) &&
            (!channel || p.sales_channels.includes(channel)) &&
            (!inventory ||
              (inventory === "tracked"
                ? stockOf(p) !== null
                : inventory === "low"
                  ? (stockOf(p) ?? Infinity) <= 10
                  : (stockOf(p) ?? 0) === 0)) &&
            `${p.title} ${p.sku} ${p.slug} ${p.vendor} ${p.tags.join(" ")}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) => {
          const av =
            sort === "inventory"
              ? (stockOf(a) ?? Infinity)
              : sort === "price"
                ? Number(a.price)
                : sort === "category"
                  ? (payload?.categories.find((c) => c.id === a.category_id)
                      ?.name ?? "")
                  : String(a[sort] ?? "");
          const bv =
            sort === "inventory"
              ? (stockOf(b) ?? Infinity)
              : sort === "price"
                ? Number(b.price)
                : sort === "category"
                  ? (payload?.categories.find((c) => c.id === b.category_id)
                      ?.name ?? "")
                  : String(b[sort] ?? "");
          return (
            (typeof av === "number" && typeof bv === "number"
              ? av - bv
              : String(av).localeCompare(String(bv))) * (ascending ? 1 : -1)
          );
        }),
    [
      products,
      selected,
      selectedOnly,
      status,
      category,
      vendor,
      tag,
      channel,
      inventory,
      query,
      sort,
      ascending,
      payload?.categories,
    ],
  );
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems: (number | "start-ellipsis" | "end-ellipsis")[] =
    pageCount <= 5
      ? Array.from({ length: pageCount }, (_, index) => index)
      : [
          0,
          ...(safePage > 2 ? (["start-ellipsis"] as const) : []),
          ...Array.from(
            { length: Math.min(3, pageCount - 2) },
            (_, index) => Math.max(1, Math.min(safePage - 1, pageCount - 4)) + index,
          ),
          ...(safePage < pageCount - 3 ? (["end-ellipsis"] as const) : []),
          pageCount - 1,
        ];
  const rows = visible.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const allPageSelected =
    rows.length > 0 && rows.every((p) => selected.includes(p.id));
  const selectedProducts = products.filter((p) => selected.includes(p.id));
  function toggle(id: string) {
    setSelected((ids) =>
      ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id],
    );
  }
  function togglePage() {
    setSelected((ids) =>
      allPageSelected
        ? ids.filter((id) => !rows.some((p) => p.id === id))
        : [...new Set([...ids, ...rows.map((p) => p.id)])],
    );
  }
  function openAction(key: string, title: string) {
    setAction({ key, title });
    setValues([]);
    setText("");
    setError("");
    if (key === "edit")
      setEdits(
        selectedProducts.map(({ id, title, vendor, merchandise_type }) => ({
          id,
          title,
          vendor,
          merchandise_type,
        })),
      );
  }
  async function commit() {
    if (!action || pending) return;
    setPending(true);
    setError("");
    const [key, statusValue] = action.key.split(":");
    const finalValues = statusValue
      ? [statusValue]
      : key.includes("tags") || key.includes("catalogs")
        ? [
            ...new Set([
              ...values,
              ...text
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean),
            ]),
          ]
        : values;
    try {
      const response = await fetch("/api/store/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selected,
          action: key,
          values: finalValues,
          edits: key === "edit" ? edits : [],
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Products could not be updated.");
      setNotice(
        `${result.updated} product${result.updated === 1 ? "" : "s"} updated.`,
      );
      setAction(null);
      setSelected([]);
      setSelectedOnly(false);
      await load();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Products could not be updated.",
      );
    } finally {
      setPending(false);
    }
  }
  const metric = payload?.analytics;
  const inventoryRemaining = products.reduce(
    (total, product) => total + (stockOf(product) ?? 0),
    0,
  );
  function sortBy(key: string) {
    if (key === sort) setAscending(!ascending);
    else {
      setSort(key);
      setAscending(true);
    }
  }
  function cell(product: Product, key: string) {
    if (key === "status")
      return (
        <Badge
          variant="secondary"
          className={cn(
            "h-5 rounded-md border-0 px-1.5 text-xs",
            product.status === "active"
              ? "bg-lime-200 text-lime-950"
              : "bg-neutral-100 text-neutral-700",
          )}
        >
          {product.status[0].toUpperCase() + product.status.slice(1)}
          {!product.is_listed ? " · Unlisted" : ""}
        </Badge>
      );
    if (key === "inventory") {
      const stock = stockOf(product);
      const count = product.variants.filter((v) => v.is_active).length;
      return product.product_type === "digital" ? (
        "Inventory not tracked"
      ) : (
        <>
          <span className={stock !== null && stock <= 10 ? classes.low : ""}>
            {stock ?? "Not tracked"}
            {stock !== null ? " in stock" : ""}
          </span>
          {count > 1 ? ` for ${count} variants` : ""}
        </>
      );
    }
    if (key === "category")
      return (
        payload?.categories.find((c) => c.id === product.category_id)?.name ||
        "Uncategorized"
      );
    if (key === "channels")
      return (
        <Menu
          label={
            <span aria-label={`Sales channels for ${product.title}`}>
              {product.sales_channels.length}
            </span>
          }
        >
          {channels.map((channel) => (
            <DropdownMenuItem
              key={channel.id}
              disabled={!payload?.canManage}
              onClick={() => {
                setSelected([product.id]);
                openAction(
                  product.sales_channels.includes(channel.id)
                    ? "exclude_channels"
                    : "include_channels",
                  "Manage sales channels",
                );
                setValues([channel.id]);
              }}
            >
              {product.sales_channels.includes(channel.id) && (
                <IconCheck size={14} />
              )}
              {channel.name}
            </DropdownMenuItem>
          ))}
        </Menu>
      );
    if (key === "price")
      return formatRecordedMoney(Number(product.price), product.currency);
    if (key === "type") return product.merchandise_type || "—";
    if (key === "tags" || key === "catalogs")
      return product[key].join(", ") || "—";
    return product.vendor || "—";
  }
  const valueAction =
    action && /tags|catalogs|channels|collections/.test(action.key);
  const options = action?.key.includes("channels")
    ? channels
    : action?.key.includes("collections")
      ? (payload?.collections ?? [])
      : [
          ...new Set(
            products.flatMap((p) =>
              action?.key.includes("catalogs") ? p.catalogs : p.tags,
            ),
          ),
        ]
          .sort()
          .map((name) => ({ id: name, name }));

  return (
    <div className={classes.workspace}>
      <CommercePageHeader
        left={
          <>
            <IconTag size={17} />
            <span>Products</span>
          </>
        }
        actions={
          <>
            <Menu
              label={
                <>
                  <IconEye size={15} /> View as
                </>
              }
            >
              <DropdownMenuItem onClick={() => setGrid(false)}>
                {!grid && <IconCheck size={14} />}List
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGrid(true)}>
                {grid && <IconCheck size={14} />}Grid
              </DropdownMenuItem>
            </Menu>
            <ProductTransfer
              products={products}
              canImport={Boolean(payload?.canManage)}
              onComplete={() => load()}
            />
            {payload?.canManage && (
              <button
                className={classes.primary}
                onClick={() => router.push(`${pathname}/new`)}
              >
                Add product
              </button>
            )}
          </>
        }
      />

      <div className="space-y-5 px-4">
        <section className={classes.metrics} aria-label="Product analytics">
          <Menu
            label={
              <>
                <IconCalendar size={14} />
                {days === 1 ? "Today" : `${days} days`}
              </>
            }
          >
            {[1, 7, 30].map((d) => (
              <DropdownMenuItem
                className={classes.periodOption}
                key={d}
                onClick={() => setDays(d)}
              >
                <span
                  className={cn(
                    "size-4 shrink-0 rounded-full border border-neutral-300",
                    days === d && "border-[5px] border-neutral-800",
                  )}
                />
                <span>
                  {d === 1 ? "Today" : `Last ${d} days`}
                  <small>
                    {d === 1
                      ? "Compared to yesterday up to current hour"
                      : `Compared to the previous ${d} days`}
                  </small>
                </span>
              </DropdownMenuItem>
            ))}
          </Menu>
          {[
            {
              key: "sellThrough",
              title: "Average sell-through rate",
              value:
                metric?.sellThrough == null
                  ? "No data"
                  : `${metric.sellThrough}%`,
            },
            {
              key: "daysRemaining",
              title: "Products by days of inventory remaining",
              value:
                metric?.daysRemaining == null
                  ? "No data"
                  : `${metric.daysRemaining} days`,
            },
            {
              key: "inventory",
              title: "Inventory remaining",
              value: products.length
                ? `${inventoryRemaining} units`
                : "No data",
            },
            {
              key: "grade",
              title: "ABC product analysis",
              value: metric ? `${formatAmount(metric.cRevenue)} C` : "No data",
            },
          ].map((item) => (
            <button
              key={item.key}
              className={classes.metric}
              onClick={() => setReport(item.key)}
            >
              <span>{item.title}</span>
              <strong>{item.value}</strong>
            </button>
          ))}
        </section>
        {error && !action && (
          <div role="alert" className={classes.error}>
            {error}
            <button onClick={() => void load()}>Retry</button>
          </div>
        )}
        {notice && (
          <div role="status" className={classes.notice}>
            {notice}
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              <IconX size={14} />
            </button>
          </div>
        )}

        <InputGroup>
          <InputGroupAddon align="inline-start">
            <Menu
              label={
                <>
                  {status}
                  <IconSelector size={14} />
                </>
              }
            >
              {["All", "Active", "Draft", "Archived"].map((value) => (
                <DropdownMenuItem key={value} onClick={() => setStatus(value)}>
                  {status === value && <IconCheck size={14} />}
                  {value}
                </DropdownMenuItem>
              ))}
            </Menu>
          </InputGroupAddon>

          <InputGroupAddon align="inline-start">
            <IconSearch />
          </InputGroupAddon>

          <InputGroupInput
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button aria-label="Clear search" onClick={() => setQuery("")}>
              <IconX size={14} />
            </button>
          )}
          <InputGroupAddon align="inline-end">
            <button
              className={classes.iconButton}
              aria-label="Product filters"
              aria-expanded={filters}
              onClick={() => setFilters(!filters)}
            >
              <IconChevronDown size={15} />
            </button>
            <Menu
              iconOnly
              label={
                <span aria-label="Display options">
                  <IconLayoutColumns size={16} />
                </span>
              }
            >
              {Object.entries(columnLabels).map(([key, label]) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={columns.includes(key)}
                  onCheckedChange={(checked) =>
                    setColumns((previous) =>
                      checked
                        ? [...previous, key]
                        : previous.filter((c) => c !== key),
                    )
                  }
                >
                  {label}
                </DropdownMenuCheckboxItem>
              ))}
            </Menu>
          </InputGroupAddon>
        </InputGroup>
        {filters && (
          <div className={classes.filters}>
            <label>
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All categories</option>
                {payload?.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Vendor
              <select
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
              >
                <option value="">All vendors</option>
                {[
                  ...new Set(products.map((p) => p.vendor).filter(Boolean)),
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Tag
              <select value={tag} onChange={(e) => setTag(e.target.value)}>
                <option value="">All tags</option>
                {[...new Set(products.flatMap((p) => p.tags))]
                  .sort()
                  .map((v) => (
                    <option key={v}>{v}</option>
                  ))}
              </select>
            </label>
            <label>
              Inventory
              <select
                value={inventory}
                onChange={(e) => setInventory(e.target.value)}
              >
                <option value="">All inventory</option>
                <option value="tracked">Tracked</option>
                <option value="low">Low stock (10 or fewer)</option>
                <option value="out">Out of stock</option>
              </select>
            </label>
            <label>
              Sales channel
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                <option value="">All channels</option>
                {channels.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => {
                setQuery("");
                setCategory("");
                setVendor("");
                setTag("");
                setChannel("");
                setInventory("");
                setStatus("All");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
        {selected.length > 0 && (
          <div
            className={classes.bulkBar}
            role="toolbar"
            aria-label="Selected product actions"
          >
            <Checkbox
              checked
              onCheckedChange={() => {
                setSelected([]);
                setSelectedOnly(false);
              }}
            />
            <Menu
              label={
                <>
                  {selected.length} selected
                  <IconChevronDown size={12} />
                </>
              }
            >
              <DropdownMenuItem
                onClick={() =>
                  setSelected(visible.slice(0, 500).map((p) => p.id))
                }
              >
                Select {Math.min(visible.length, 500)} matching products
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelected([]);
                  setSelectedOnly(false);
                }}
              >
                Clear selection
              </DropdownMenuItem>
            </Menu>
            {payload?.canManage && (
              <>
                <button
                  onClick={() => openAction("edit", "Bulk edit products")}
                >
                  Bulk edit
                </button>
                <button
                  onClick={() =>
                    openAction("status:draft", "Set products as draft")
                  }
                >
                  Set as draft
                </button>
                <Menu
                  iconOnly
                  label={
                    <span aria-label="More product actions">
                      <IconDots size={17} />
                    </span>
                  }
                >
                  {bulkActions.map((item, index) => (
                    <div key={item.key}>
                      {[4, 6, 8, 10].includes(index) && (
                        <DropdownMenuSeparator />
                      )}
                      <DropdownMenuItem
                        className={item.key === "delete" ? classes.low : ""}
                        onClick={() => openAction(item.key, item.title)}
                      >
                        {item.icon && <item.icon size={15} />}
                        {item.title}
                      </DropdownMenuItem>
                    </div>
                  ))}
                </Menu>
              </>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedOnly}
                onCheckedChange={(checked) => setSelectedOnly(checked)}
              />
              <Label> Show all selected</Label>
            </div>
          </div>
        )}
        <div className={classes.tableWrap} aria-busy={loading}>
          {grid ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
              {rows.map((product) => (
                <article key={product.id}>
                  <Checkbox
                    checked={selected.includes(product.id)}
                    onCheckedChange={() => toggle(product.id)}
                  />
                  <Thumbnail key={product.image_url} src={product.image_url} />
                  <button
                    onClick={() => router.push(`${pathname}/${product.id}`)}
                  >
                    {product.title}
                  </button>
                  {cell(product, "status")}
                  {cell(product, "inventory")}
                </article>
              ))}
            </div>
          ) : (
            <Table className={classes.table}>
              <TableHeader
                className={selected.length ? classes.hiddenHead : "bg-muted/40"}
              >
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allPageSelected}
                      ref={(node) => {
                        const input = node?.querySelector("input");
                        if (input)
                          input.indeterminate =
                            !allPageSelected &&
                            rows.some((p) => selected.includes(p.id));
                      }}
                      onCheckedChange={togglePage}
                    />
                  </TableHead>
                  <TableHead>
                    <button onClick={() => sortBy("title")}>
                      Product {sort === "title" && <IconSelector size={12} />}
                    </button>
                  </TableHead>
                  {columns.map((key) => (
                    <TableHead key={key}>
                      <button
                        onClick={() =>
                          sortBy(key === "type" ? "merchandise_type" : key)
                        }
                      >
                        {columnLabels[key]}
                        {sort === key && <IconSelector size={12} />}
                      </button>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((product) => (
                  <TableRow
                    key={product.id}
                    data-state={
                      selected.includes(product.id) ? "selected" : undefined
                    }
                  >
                    <TableCell className="w-10">
                      <Checkbox
                        checked={selected.includes(product.id)}
                        onCheckedChange={() => toggle(product.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        className={classes.productLink}
                        onClick={() => router.push(`${pathname}/${product.id}`)}
                      >
                        <Thumbnail
                          key={product.image_url}
                          src={product.image_url}
                        />
                        <span className={classes.productName}>
                          <strong>{product.title}</strong>
                          <small>{product.sku || "No SKU"}</small>
                        </span>
                      </button>
                    </TableCell>
                    {columns.map((key) => (
                      <TableCell key={key}>{cell(product, key)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!rows.length && (
            <div className={classes.empty}>
              {loading ? "Loading products…" : "No products match this view."}
            </div>
          )}
        </div>
        {visible.length > pageSize && (
          <div className={classes.pagination}>
            <span>
              {safePage * pageSize + 1}–
              {Math.min((safePage + 1) * pageSize, visible.length)} of{" "}
              {visible.length}
            </span>
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    aria-disabled={safePage === 0}
                    className={safePage === 0 ? "pointer-events-none opacity-50" : ""}
                    onClick={(event) => {
                      event.preventDefault();
                      if (safePage > 0) setPage(safePage - 1);
                    }}
                  />
                </PaginationItem>
                {pageItems.map((item, index) => (
                  <PaginationItem key={`${item}-${index}`}>
                    {typeof item === "string" ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        href="#"
                        isActive={item === safePage}
                        aria-label={`Go to page ${item + 1}`}
                        onClick={(event) => {
                          event.preventDefault();
                          setPage(item);
                        }}
                      >
                        {item + 1}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    aria-disabled={safePage + 1 >= pageCount}
                    className={safePage + 1 >= pageCount ? "pointer-events-none opacity-50" : ""}
                    onClick={(event) => {
                      event.preventDefault();
                      if (safePage + 1 < pageCount) setPage(safePage + 1);
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <select
              aria-label="Products per page"
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {[25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} per page
                </option>
              ))}
            </select>
          </div>
        )}
        <button className={classes.learn} onClick={() => setReport("help")}>
          Learn more about products
        </button>
        <Dialog
          open={Boolean(action)}
          onOpenChange={(open) => {
            if (!open && !pending) {
              setAction(null);
              setError("");
            }
          }}
        >
          <DialogContent
            className={action?.key === "edit" ? classes.editDialog : ""}
          >
            <DialogHeader>
              <DialogTitle>{action?.title}</DialogTitle>
              <DialogDescription>
                {action?.key === "delete"
                  ? `${selected.length} products will move to Recently deleted. Restore them within 15 days.`
                  : `Apply changes to ${selected.length} selected product${selected.length === 1 ? "" : "s"}.`}
              </DialogDescription>
            </DialogHeader>
            {valueAction && (
              <div className={classes.optionList}>
                {options.map((option) => (
                  <label key={option.id}>
                    <Checkbox
                      checked={values.includes(option.id)}
                      onCheckedChange={() =>
                        setValues((previous) =>
                          previous.includes(option.id)
                            ? previous.filter((v) => v !== option.id)
                            : [...previous, option.id],
                        )
                      }
                    />
                    {option.name}
                  </label>
                ))}
                {/tags|catalogs/.test(action.key) && (
                  <label>
                    {action.key.startsWith("remove") ||
                    action.key.startsWith("exclude")
                      ? "Names, separated by commas"
                      : "Add names, separated by commas"}
                    <Input
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={
                        action.key.includes("tags")
                          ? "summer, sale"
                          : "Wholesale, Retail"
                      }
                    />
                  </label>
                )}
                {!options.length && /collections/.test(action.key) && (
                  <p>No collections exist. Create a collection first.</p>
                )}
              </div>
            )}
            {action?.key === "edit" && (
              <div className={classes.editTable}>
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Vendor</th>
                      <th>Product type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {edits.map((edit, index) => (
                      <tr key={edit.id}>
                        {(["title", "vendor", "merchandise_type"] as const).map(
                          (key) => (
                            <td key={key}>
                              <Input
                                aria-label={`${key} for ${edit.title}`}
                                value={edit[key]}
                                onChange={(event) =>
                                  setEdits((previous) =>
                                    previous.map((row, i) =>
                                      i === index
                                        ? { ...row, [key]: event.target.value }
                                        : row,
                                    ),
                                  )
                                }
                              />
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {error && (
              <p role="alert" className={classes.low}>
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setAction(null);
                  setError("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant={action?.key === "delete" ? "destructive" : "default"}
                disabled={
                  pending ||
                  Boolean(valueAction && !values.length && !text.trim()) ||
                  (action?.key === "edit" && edits.some((e) => !e.title.trim()))
                }
                onClick={() => void commit()}
              >
                {pending
                  ? "Saving…"
                  : action?.key === "delete"
                    ? "Delete products"
                    : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={Boolean(report)}
          onOpenChange={(open) => {
            if (!open) setReport(null);
          }}
        >
          <DialogContent className={classes.editDialog}>
            <DialogHeader>
              <DialogTitle>
                {report === "help"
                  ? "Managing products"
                  : report === "sellThrough"
                    ? "Average sell-through rate"
                    : report === "daysRemaining"
                      ? "Days of inventory remaining"
                      : "ABC product analysis"}
              </DialogTitle>
              <DialogDescription>
                {report === "help"
                  ? "Search by title, SKU, handle, vendor, or tag. Select products for bulk edits, publication, tags, catalogs, and collections. Deleted products can be restored from Recycle bin for 15 days."
                  : `Last ${days} day${days === 1 ? "" : "s"} · ${currency} · India time. Paid, non-cancelled orders only. Sell-through = units sold / (units sold + available stock). Days remaining = available stock / daily units sold. ABC grades use cumulative sales revenue: A 80%, B next 15%, C remaining 5%.`}
              </DialogDescription>
            </DialogHeader>
            {report !== "help" && (
              <>
                {payload?.analyticsError && (
                  <p role="alert">{payload.analyticsError}</p>
                )}
                <div className={classes.editTable}>
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Units sold</th>
                        <th>Sell-through</th>
                        <th>Days remaining</th>
                        <th>Revenue ({currency})</th>
                        <th>Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metric?.products.map((row) => (
                        <tr key={row.id}>
                          <td>{row.title}</td>
                          <td>{row.units}</td>
                          <td>
                            {row.sellThrough == null
                              ? "—"
                              : `${row.sellThrough}%`}
                          </td>
                          <td>{row.daysRemaining ?? "—"}</td>
                          <td>{formatAmount(row.revenue)}</td>
                          <td>{row.grade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
