"use client";

import Link from "next/link";
import { format as formatDate } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  IconAlertTriangle,
  IconArrowDownRight,
  IconArrowUpRight,
  IconBox,
  IconCalendar,
  IconCheck,
  IconCircleCheck,
  IconCurrencyDollar,
  IconPackage,
  IconPlus,
  IconRefresh,
  IconShoppingBag,
  IconSparkles,
  IconTrendingUp,
} from "@tabler/icons-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { formatRecordedMoney, formatStoreMoney, STORE_CURRENCY } from "@/lib/currency";

type StoreOrder = {
  id: string;
  total: number;
  currency: string | null;
  status: string;
  payment_status: string;
  created_at: string;
};

type StoreProduct = {
  id: string;
  title: string;
  sku: string;
  status: "draft" | "active" | "archived";
  price: number;
  currency: string;
  product_type: "physical" | "digital";
  stock: number | null;
  store_product_variants: {
    price: number;
    stock: number | null;
    store_inventory_levels?: { on_hand: number; reserved: number }[];
  }[];
};

type CatalogHealth = {
  activeProducts: number;
  activeCategories: number;
  activeSubcategories: number;
  productsWithoutMedia: string[];
  productsWithoutVariants: string[];
  rightsReviewProducts: string[];
  orphanedTaxonomy: string[];
  duplicateProductSlugs: string[];
  duplicateProductSkus: string[];
};

type HealthFilter =
  | "missing_media"
  | "missing_variants"
  | "rights_review"
  | "taxonomy"
  | "duplicate_slug"
  | "duplicate_sku";

type Props = {
  products: StoreProduct[];
  loading: boolean;
  range: "7d" | "30d" | "90d" | "all" | "custom";
  setRange: (range: "7d" | "30d" | "90d" | "all" | "custom") => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  displayedSales: number;
  periodOrders: StoreOrder[];
  ordersAvailable: boolean;
  orderCount: number | null;
  pendingOrders: number | null;
  ordersCurrency: string | null;
  mixedOrderCurrencies: boolean;
  legacyPaidByCurrency: Record<string, number>;
  catalogHealth: CatalogHealth | null;
  canManageCatalog: boolean;
  configured: boolean;
  editProduct: () => void;
  onRefresh: () => void;
  openHealthFilter: (filter: HealthFilter) => void;
};

const healthItems = [
  ["missing_media", "Product images", "Add clear product photography"],
  ["missing_variants", "Product variants", "Complete size and option details"],
  ["rights_review", "Rights checks", "Review products that need approval"],
  ["taxonomy", "Category links", "Connect products to active categories"],
  ["duplicate_slug", "Duplicate slugs", "Give every product a unique URL"],
  ["duplicate_sku", "Duplicate SKUs", "Keep product identifiers unique"],
] as const;

const healthProperties = {
  missing_media: "productsWithoutMedia",
  missing_variants: "productsWithoutVariants",
  rights_review: "rightsReviewProducts",
  taxonomy: "orphanedTaxonomy",
  duplicate_slug: "duplicateProductSlugs",
  duplicate_sku: "duplicateProductSkus",
} as const;

const chartConfig = {
  sales: { label: "Sales", theme: { light: "#76aaff", dark: "#9aafff" } },
  orders: { label: "Orders", color: "var(--color-chart-2)" },
} satisfies ChartConfig;

function getAvailableStock(product: StoreProduct) {
  if (product.product_type === "digital") return null;
  if (!product.store_product_variants?.length) return product.stock;
  return product.store_product_variants.reduce((total, variant) => {
    const levels = variant.store_inventory_levels ?? [];
    return total + (levels.length
      ? levels.reduce(
          (sum, level) => sum + Math.max(0, level.on_hand - level.reserved),
          0,
        )
      : (variant.stock ?? 0));
  }, 0);
}

function getInventoryValue(product: StoreProduct) {
  if (product.product_type === "digital") return 0;
  if (!product.store_product_variants?.length) return (product.stock ?? 0) * Number(product.price || 0);
  return product.store_product_variants.reduce((total, variant) => {
    const levels = variant.store_inventory_levels ?? [];
    const available = levels.length
      ? levels.reduce((sum, level) => sum + Math.max(0, level.on_hand - level.reserved), 0)
      : (variant.stock ?? 0);
    return total + available * Number(variant.price || product.price || 0);
  }, 0);
}

function getQualityPercent(health: CatalogHealth | null) {
  if (!health) return 0;
  const totalIssues = Object.values(healthProperties).reduce(
    (total, key) => total + health[key].length,
    0,
  );
  const possibleIssues = Math.max(health.activeProducts * 6, 1);
  return Math.max(0, Math.min(100, Math.round(100 - (totalIssues / possibleIssues) * 100)));
}

export function StoreOverviewDashboard({
  products,
  loading,
  range,
  setRange,
  dateRange,
  setDateRange,
  displayedSales,
  periodOrders,
  ordersAvailable,
  orderCount,
  pendingOrders,
  legacyPaidByCurrency,
  catalogHealth,
  canManageCatalog,
  configured,
  editProduct,
  onRefresh,
  openHealthFilter,
}: Props) {
  const activeProducts = products.filter((product) => product.status === "active");
  const physicalProducts = activeProducts.filter(
    (product) => product.product_type === "physical",
  );
  const lowStockProducts = physicalProducts.filter((product) => {
    const stock = getAvailableStock(product);
    return stock !== null && stock <= 5;
  });
  const inventoryUnits = physicalProducts.reduce(
    (sum, product) => sum + (getAvailableStock(product) ?? 0),
    0,
  );
  const inventoryValue = formatStoreMoney(
    physicalProducts.reduce((sum, product) => sum + getInventoryValue(product), 0),
  );
  const currency = STORE_CURRENCY;
  const paidOrders = periodOrders.filter(
    (order) => (order.payment_status === "paid" || order.status === "paid") && (order.currency || STORE_CURRENCY) === STORE_CURRENCY,
  );
  const orderTrend = periodOrders
    .slice()
    .reverse()
    .map((order) => ({
      date: new Date(order.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      sales:
        order.payment_status === "paid" || order.status === "paid"
          ? (order.currency || STORE_CURRENCY) === STORE_CURRENCY ? Number(order.total || 0) : 0
          : 0,
      orders: 1,
    }));
  const totalIssues = catalogHealth
    ? Object.values(healthProperties).reduce(
        (total, key) => total + catalogHealth[key].length,
        0,
      )
    : 0;
  const qualityScore = getQualityPercent(catalogHealth);
  const quality = qualityScore;
  const checklist = [
    {
      label: "Add your first product",
      detail: "Give customers something great to discover.",
      done: products.length > 0,
      href: "/store/products",
    },
    {
      label: "Organize your catalog",
      detail: "Make browsing feel effortless.",
      done: (catalogHealth?.activeCategories ?? 0) > 0,
      href: "/store/categories",
    },
    {
      label: "Review inventory",
      detail: "Catch low stock before it becomes a problem.",
      done: lowStockProducts.length === 0 && activeProducts.length > 0,
      href: "/store/inventory",
    },
  ];

  return (
    <main className="relative mx-auto flex w-full max-w-[1500px] flex-col gap-6 overflow-hidden pb-12">

      <header className="relative flex flex-col gap-5 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.45)]" />
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Commerce overview
            </p>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
            Good morning. <span className="text-muted-foreground">Here&apos;s your store.</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            A thoughtful overview of sales, orders, and what needs your attention.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={onRefresh} disabled={loading}>
            <IconRefresh className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button
            onClick={editProduct}
            disabled={!canManageCatalog || !configured || loading}
          >
            <IconPlus />
            Add product
          </Button>
        </div>
      </header>

      <section className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Your numbers</h2>
          <p className="text-sm text-muted-foreground">
            INR sales reflect every order in the selected period.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-0.5 rounded-xl border border-border/80 bg-card/80 p-1 shadow-sm backdrop-blur">
            {(["7d", "30d", "90d", "all"] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={range === item}
                onClick={() => setRange(item)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  range === item
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item === "all" ? "All time" : item.replace("d", " days")}
              </button>
            ))}
          </div>
          <Popover>
            <PopoverTrigger className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/80 bg-card/80 px-3 text-sm text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground">
              <IconCalendar className="size-4" />
              <span>
                {dateRange.from
                  ? formatDate(dateRange.from, "MMM d")
                  : "Date range"}
                {dateRange.to ? ` – ${formatDate(dateRange.to, "MMM d")}` : ""}
              </span>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-3">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(selected) => {
                  setDateRange(selected ?? { from: undefined });
                  setRange("custom");
                }}
                numberOfMonths={1}
              />
            </PopoverContent>
          </Popover>
        </div>
      </section>

      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        aria-label="Store metrics"
      >
        <MetricCard
          title="Gross sales"
          value={
            !ordersAvailable
              ? "—"
              : formatStoreMoney(displayedSales)
          }
          detail={
            range === "all"
              ? "Lifetime paid INR sales"
              : `${paidOrders.length} paid INR orders in selected period`
          }
          icon={<IconCurrencyDollar />}
          tint="lime"
          trend={orderTrend.map((item) => item.sales)}
          className="xl:col-span-2"
        />
        <MetricCard
          title="Orders"
          value={ordersAvailable ? (orderCount ?? "—") : "—"}
          detail={
            pendingOrders
              ? `${pendingOrders} need fulfillment`
              : "All orders are up to date"
          }
          icon={<IconShoppingBag />}
          tint="blue"
        />
        <MetricCard
          title="Active products"
          value={activeProducts.length}
          detail={`${products.length - activeProducts.length} drafts or archived`}
          icon={<IconPackage />}
          tint="violet"
        />
        <MetricCard
          title="Inventory value"
          value={inventoryValue}
          detail={`${inventoryUnits.toLocaleString("en-IN")} units available · variant prices`}
          icon={<IconBox />}
          tint="orange"
          valueClassName="!text-[1.35rem]"
        />
      </section>

      {Object.keys(legacyPaidByCurrency).length > 0 && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Historical non-INR payments are kept separate for accounting accuracy: {Object.entries(legacyPaidByCurrency).map(([code, amount]) => formatRecordedMoney(Number(amount), code)).join(" · ")}.
        </p>
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,.75fr)]">
        <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Sales performance</CardTitle>
                <Badge variant="secondary" className="rounded-full font-normal">
                  <span className="mr-1 size-1.5 rounded-full bg-primary" />
                  Live data
                </Badge>
              </div>
              <CardDescription>
                Paid INR order totals for the selected period.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {ordersAvailable && orderTrend.length ? (
              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-semibold tracking-tight tabular-nums">
                      {formatStoreMoney(displayedSales)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Paid sales in selected period
                    </p>
                  </div>
                  <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                    <IconTrendingUp className="size-3.5" />
                    {paidOrders.length} paid
                  </span>
                </div>
                <ChartContainer config={chartConfig} className="h-[220px] w-full">
                  <BarChart
                    data={orderTrend}
                    margin={{ top: 12, right: 8, left: 4, bottom: 0 }}
                    accessibilityLayer
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 5" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      minTickGap={20}
                    />
                    <YAxis hide />
                    <ChartTooltip
                      cursor={{ stroke: "var(--color-sales)", strokeDasharray: "4 4" }}
                      content={
                        <ChartTooltipContent
                          formatter={(value) => [
                            formatStoreMoney(Number(value)),
                            "Paid sales",
                          ]}
                        />
                      }
                    />
                    <Bar
                      dataKey="sales"
                      fill="var(--color-sales)"
                      radius={[6, 6, 1, 1]}
                      maxBarSize={44}
                    />
                  </BarChart>
                </ChartContainer>
                <p className="text-xs text-muted-foreground">
                  Trend includes all {orderTrend.length} orders in the selected period; legacy non-INR totals are excluded.
                </p>
              </div>
            ) : (
              <div className="grid h-[280px] place-items-center rounded-xl border border-dashed">
                <div className="text-center">
                  <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <IconTrendingUp className="size-5" />
                  </span>
                  <p className="mt-3 text-sm font-medium">
                    {ordersAvailable ? "Your first sale is waiting" : "Sales data unavailable"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {ordersAvailable
                      ? "Your sales activity will take shape here."
                      : "Reconnect your orders data to see performance."}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-lg">Inventory pulse</CardTitle>
              <CardDescription>Stock across published products</CardDescription>
            </div>
            <span
              className={`grid size-9 place-items-center rounded-xl ${
                lowStockProducts.length
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              }`}
            >
              {lowStockProducts.length ? (
                <IconAlertTriangle className="size-[18px]" />
              ) : (
                <IconCircleCheck className="size-[18px]" />
              )}
            </span>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-4xl font-semibold tracking-tight tabular-nums">
                  {inventoryUnits.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">units on hand</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold tabular-nums">
                  {lowStockProducts.length}
                </p>
                <p className="text-xs text-muted-foreground">need attention</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Healthy stock</span>
                <span className="font-medium">
                  {Math.max(physicalProducts.length - lowStockProducts.length, 0)} of {physicalProducts.length} products
                </span>
              </div>
              <Progress
                value={
                  physicalProducts.length
                    ? (Math.max(physicalProducts.length - lowStockProducts.length, 0) /
                        physicalProducts.length) *
                      100
                    : 0
                }
                className="gap-0"
                aria-label="Healthy stock percentage"
              />
            </div>

            {lowStockProducts.length ? (
              <div className="space-y-3">
                {lowStockProducts.slice(0, 3).map((product) => {
                  const stock = getAvailableStock(product);
                  return (
                    <div key={product.id} className="flex items-center gap-3">
                      <div className="grid size-9 place-items-center rounded-xl bg-muted">
                        <IconPackage className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{product.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {stock === 0 ? "Out of stock" : `${stock} remaining`}
                        </p>
                      </div>
                      <span className="size-2 rounded-full bg-amber-500" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl bg-muted/50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <IconCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                  Everything is in good shape
                </div>
                <p className="mt-1 pl-6 text-xs text-muted-foreground">
                  No active products are running low.
                </p>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              render={<Link href="/store/inventory" />}
              nativeButton={false}
            >
              Open inventory <IconArrowUpRight />
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.85fr)]">
        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-lg">Recent orders</CardTitle>
              <CardDescription>Keep an eye on what just came in.</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/orders" />}
              nativeButton={false}
            >
              All orders <IconArrowUpRight />
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-6 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-28 text-center text-muted-foreground">
                      Loading recent orders…
                    </TableCell>
                  </TableRow>
                ) : !ordersAvailable ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-28 text-center text-muted-foreground">
                      Order data is unavailable.
                    </TableCell>
                  </TableRow>
                ) : periodOrders.length ? (
                  periodOrders.slice(0, 5).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="pl-6 font-medium">
                        <span className="inline-flex items-center gap-2">
                          <span className="grid size-8 place-items-center rounded-lg bg-muted">
                            <IconShoppingBag className="size-4 text-muted-foreground" />
                          </span>
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.payment_status === "paid"
                              ? "secondary"
                              : "outline"
                          }
                          className="capitalize"
                        >
                          {order.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right font-medium tabular-nums">
                        <span className="inline-flex items-center justify-end gap-2">
                          {formatRecordedMoney(Number(order.total), order.currency || currency)}
                          {(order.currency || currency) !== STORE_CURRENCY && <Badge variant="outline">Legacy</Badge>}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-28 text-center text-muted-foreground">
                      No orders in this period yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-lg">Catalog readiness</CardTitle>
              <CardDescription>
                {catalogHealth
                  ? `${catalogHealth.activeProducts} active products · ${catalogHealth.activeCategories} categories`
                  : "A tidy catalog helps customers find their next favorite."}
              </CardDescription>
            </div>
            <Badge
              variant={totalIssues ? "secondary" : "outline"}
              className="rounded-full"
            >
              {catalogHealth
                ? totalIssues
                  ? `${totalIssues} to review`
                  : "Looking good"
                : "Checking"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-muted/50 p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Catalog score</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                    {catalogHealth ? `${quality}%` : "—"}
                  </p>
                </div>
                <span className="pb-1 text-xs text-muted-foreground">
                  {catalogHealth ? "ready to sell" : "health unavailable"}
                </span>
              </div>
              <Progress
                value={quality}
                className="mt-3 gap-0"
                aria-label="Catalog readiness score"
              />
            </div>

            <div className="space-y-1">
              {healthItems.map(([key, label, hint]) => {
                const count = catalogHealth
                  ? catalogHealth[healthProperties[key]].length
                  : 0;
                return (
                  <button
                    type="button"
                    key={key}
                    disabled={!catalogHealth}
                    onClick={() => openHealthFilter(key)}
                    className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-muted/60 disabled:cursor-default"
                  >
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                        count
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {count ? (
                        <IconAlertTriangle className="size-4" />
                      ) : (
                        <IconCircleCheck className="size-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {count ? hint : "Everything looks good"}
                      </span>
                    </span>
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        count ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
                      }`}
                    >
                      {catalogHealth ? count : "—"}
                    </span>
                    {count > 0 && (
                      <IconArrowUpRight className="size-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <Card className="overflow-hidden rounded-2xl border-0 bg-foreground text-background shadow-sm">
          <CardContent className="relative flex h-full min-h-52 flex-col justify-between p-6 sm:p-7">
            <div className="pointer-events-none absolute -right-8 -top-16 size-64 rounded-full border border-background/10" />
            <div className="pointer-events-none absolute -right-1 -top-9 size-48 rounded-full border border-background/10" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <Badge className="border-0 bg-background/10 text-background hover:bg-background/15">
                  <IconSparkles className="mr-1 size-3.5" />
                  Your store at a glance
                </Badge>
                <h2 className="mt-4 max-w-lg text-2xl font-semibold tracking-tight sm:text-3xl">
                  Small improvements make a store feel remarkable.
                </h2>
                <p className="mt-2 max-w-xl text-sm text-background/65">
                  {catalogHealth && totalIssues
                    ? `${totalIssues} catalog details could use a quick look. Pick one and make today count.`
                    : "Your catalog is in great shape. Keep products fresh and inventory up to date."}
                </p>
              </div>
              <IconArrowDownRight className="hidden size-6 text-primary sm:block" />
            </div>
            <div className="relative mt-6 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                render={<Link href={totalIssues ? "/store/products" : "/store/inventory"} />}
                nativeButton={false}
              >
                {totalIssues ? "Review catalog" : "View inventory"}
                <IconArrowUpRight />
              </Button>
              <Button
                variant="ghost"
                className="text-background hover:bg-background/10 hover:text-background"
                render={<Link href="/store/categories" />}
                nativeButton={false}
              >
                Organize categories
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">A good next step</CardTitle>
              <IconSparkles className="size-4 text-primary" />
            </div>
            <CardDescription>Three simple ways to keep momentum.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {checklist.map((item, index) => (
              <Link
                key={item.label}
                href={item.href}
                className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-muted/60"
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full border text-xs font-medium ${
                    item.done
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {item.done ? <IconCheck className="size-4" /> : `0${index + 1}`}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.detail}
                  </span>
                </span>
                <IconArrowUpRight className="size-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function MetricCard({
  title,
  value,
  detail,
  icon,
  tint,
  trend,
  className,
  valueClassName,
}: {
  title: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
  tint: "lime" | "blue" | "violet" | "orange";
  trend?: number[];
  className?: string;
  valueClassName?: string;
}) {
  const cardClasses = {
    lime: "border-border bg-card text-card-foreground ring-0",
    blue: "border-transparent bg-[#ed5b27] text-white ring-0 dark:bg-[#ed5b27]",
    violet: "border-violet-200/70 bg-violet-50 text-violet-950 dark:border-violet-300/10 dark:bg-violet-950/35 dark:text-violet-50",
    orange: "border-border/70 bg-card text-card-foreground",
  };
  const tintClasses = {
    lime: "bg-primary/10 text-primary",
    blue: "bg-white/15 text-white",
    violet: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    orange: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  };
  const mutedTextClasses = {
    lime: "text-muted-foreground",
    blue: "text-white/75",
    violet: "text-violet-900/60 dark:text-violet-100/60",
    orange: "text-muted-foreground",
  };

  return (
    <Card className={`group relative overflow-hidden rounded-2xl shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${cardClasses[tint]} ${className || ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className={`text-sm font-medium ${mutedTextClasses[tint]}`}>{title}</p>
          <span className={`grid size-9 place-items-center rounded-xl ${tintClasses[tint]} [&_svg]:size-[18px]`}>
            {icon}
          </span>
        </div>
        <p className={`mt-5 whitespace-nowrap text-[clamp(1.35rem,2vw,2rem)] font-semibold leading-tight tracking-[-0.045em] tabular-nums ${valueClassName || ""}`}>
          {value}
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className={`truncate text-xs ${mutedTextClasses[tint]}`}>{detail}</p>
          {trend && trend.some((amount) => amount > 0) && (
            <span className="shrink-0 text-primary [&_svg]:size-4">
              <MiniTrend values={trend} />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MiniTrend({ values }: { values: number[] }) {
  const data = values.map((value, index) => ({ index, value }));
  return (
    <ResponsiveContainer width={56} height={24}>
      <BarChart data={data}>
        <Bar dataKey="value" fill="currentColor" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
