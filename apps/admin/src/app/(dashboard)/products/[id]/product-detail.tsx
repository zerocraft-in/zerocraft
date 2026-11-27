"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@zerocraft/ui/toast";
import {
  Package,
  DollarSign,
  Calendar,
  ChevronRight,
  Edit,
  Archive,
  RotateCcw,
  Plus,
  Eye,
} from "lucide-react";

import { archiveProduct, setProductStatus } from "../actions";
import { formatPaise, paise } from "@/lib/money";
import { Button } from "@zerocraft/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@zerocraft/ui/card";
import { Badge } from "@zerocraft/ui/badge";
import { Separator } from "@zerocraft/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@zerocraft/ui/dropdown-menu";

type VariantRow = {
  id: string;
  sku: string;
  barcode: string | null;
  size: string | null;
  colour: string | null;
  cost_price_paise: number;
  selling_price_paise: number;
  tax_rate_bps: number | null;
  reorder_point: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ProductRow = {
  id: string;
  organization_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  status: string;
  tax_rate_bps: number;
  is_tax_inclusive: boolean;
  created_at: string;
  updated_at: string;
  product_variants: VariantRow[];
};

function formatTax(bps: number): string {
  const percent = bps / 100;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(2)}%`;
}

function statusBadgeVariant(
  status: string,
): "success" | "warning" | "default" {
  switch (status) {
    case "active":
      return "success";
    case "draft":
      return "warning";
    default:
      return "default";
  }
}

function formatMoney(value: number): string {
  return formatPaise(paise(Number(value)));
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface ProductDetailProps {
  product: ProductRow;
  canUpdate: boolean;
  canArchive: boolean;
}

export default function ProductDetail({
  product,
  canUpdate,
  canArchive,
}: ProductDetailProps) {
  const router = useRouter();
  const [isArchiving, setIsArchiving] = React.useState(false);
  const [isChangingStatus, setIsChangingStatus] = React.useState<string | null>(null);
  const activeVariants = product.product_variants.filter((v) => v.is_active).length;

  const handleArchive = async () => {
    if (
      !window.confirm(
        `Archive "${product.name}"? Its variants will stop being sellable.`,
      )
    ) {
      return;
    }

    setIsArchiving(true);
    try {
      const result = await archiveProduct({ id: product.id });
      if (result.ok) {
        toast.add({ title: "Product archived.", type: "success" });
        router.push("/products");
      } else {
        toast.add({ title: result.error, type: "error" });
      }
    } finally {
      setIsArchiving(false);
    }
  };

  const handleStatusChange = async (status: "draft" | "active") => {
    setIsChangingStatus(status);
    try {
      const result = await setProductStatus({ id: product.id, status });
      if (result.ok) {
        toast.add({ title: status === "active" ? "Product activated." : "Product set to draft.", type: "success" });
        router.refresh();
      } else {
        toast.add({ title: result.error, type: "error" });
      }
    } finally {
      setIsChangingStatus(null);
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col px-5 py-6 sm:px-8 sm:py-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div className="flex items-center gap-4">
          <div
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand text-[16px] font-bold text-brand-fg"
          >
            <Package className="size-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-[-0.02em] text-body truncate">
                {product.name}
              </h1>
              <Badge variant={statusBadgeVariant(product.status)}>
                {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
              </Badge>
            </div>
            {product.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {product.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href={`/products/${product.id}/edit`}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            <Edit className="size-4" />
            Edit
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="outline" className="gap-2">
                <ChevronRight className="size-4" />
                More
              </Button>
            } />
            <DropdownMenuContent align="end" className="min-w-[180px]">
              {product.status === "draft" && canUpdate && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange("active")}
                  disabled={isChangingStatus === "active"}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="size-4" />
                  {isChangingStatus === "active" ? "Activating..." : "Activate"}
                </DropdownMenuItem>
              )}
              {product.status === "active" && canUpdate && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange("draft")}
                  disabled={isChangingStatus === "draft"}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="size-4" />
                  {isChangingStatus === "draft" ? "Drafting..." : "Set to Draft"}
                </DropdownMenuItem>
              )}
              {canArchive && product.status !== "archived" && (
                <DropdownMenuItem
                  onClick={handleArchive}
                  disabled={isArchiving}
                  className="flex items-center gap-2 text-destructive focus:text-destructive"
                >
                  <Archive className="size-4" />
                  {isArchiving ? "Archiving..." : "Archive"}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Separator className="mb-8" />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main product info */}
        <div className="md:col-span-2 space-y-6">
          {/* Pricing & Tax */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="size-5" />
                Pricing & Tax
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Default Tax Rate
                  </p>
                  <p className="text-lg font-medium text-body">
                    {formatTax(product.tax_rate_bps)}
                    {product.is_tax_inclusive && (
                      <span className="ml-2 text-xs text-muted-foreground">(incl.)</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Tax Inclusive
                  </p>
                  <p className="text-lg font-medium text-body">
                    {product.is_tax_inclusive ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        

          {/* Variants */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="size-5" />
                  Variants
                </CardTitle>
                <span className="text-sm text-muted-foreground">
                  {activeVariants} active / {product.product_variants.length} total
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {product.product_variants.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No variants yet. Add one to make this product sellable.
                  </p>
                  <Link
                    href={`/products/${product.id}/variants/new`}
                    className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Plus className="size-4" />
                    Add Variant
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b">
                        <th className="text-left pb-3">SKU</th>
                        <th className="text-left pb-3">Barcode</th>
                        <th className="text-left pb-3">Size / Colour</th>
                        <th className="text-right pb-3">Cost</th>
                        <th className="text-right pb-3">Selling</th>
                        <th className="text-right pb-3">Tax</th>
                        <th className="text-right pb-3">Reorder</th>
                        <th className="text-left pb-3 pl-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.product_variants.map((variant) => (
                        <tr key={variant.id} className="border-b last:border-0">
                          <td className="py-3 font-medium text-body">{variant.sku}</td>
                          <td className="py-3 text-muted-foreground">
                            {variant.barcode ?? "—"}
                          </td>
                          <td className="py-3 text-muted-foreground">
                            {variant.size || variant.colour
                              ? [variant.size, variant.colour]
                                  .filter(Boolean)
                                  .join(" / ")
                              : "—"}
                          </td>
                          <td className="py-3 text-right text-muted-foreground">
                            {formatMoney(variant.cost_price_paise)}
                          </td>
                          <td className="py-3 text-right text-body">
                            {formatMoney(variant.selling_price_paise)}
                          </td>
                          <td className="py-3 text-right text-muted-foreground">
                            {variant.tax_rate_bps != null
                              ? formatTax(variant.tax_rate_bps)
                              : "Inherited"}
                          </td>
                          <td className="py-3 text-right text-muted-foreground">
                            {variant.reorder_point}
                          </td>
                          <td className="py-3 pl-3">
                            <Badge
                              variant={variant.is_active ? "success" : "default"}
                            >
                              {variant.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="size-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href={`/products/${product.id}/edit`}
                className="flex w-full items-center gap-3 rounded-md p-3 text-sm text-body transition-colors hover:bg-muted"
              >
                <Edit className="size-4 text-muted-foreground" />
                Edit Product
              </Link>
              <Link
                href={`/products/${product.id}/variants/new`}
                className="flex w-full items-center gap-3 rounded-md p-3 text-sm text-body transition-colors hover:bg-muted"
              >
                <Plus className="size-4 text-muted-foreground" />
                Add Variant
              </Link>
              <Link
                href="/products"
                className="flex w-full items-center gap-3 rounded-md p-3 text-sm text-body transition-colors hover:bg-muted"
              >
                <RotateCcw className="size-4 text-muted-foreground" />
                Back to Products
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="size-5" />
                Timestamps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Created
                </p>
                <p className="text-body">{formatDate(product.created_at)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Last Updated
                </p>
                <p className="text-body">{formatDate(product.updated_at)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Identifiers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Product ID
                </p>
                <p className="font-mono text-xs text-body break-all">{product.id}</p>
              </div>
              {product.category_id && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    category GID
                  </p>
                  <p className="font-mono text-xs text-body break-all">
                    {product.category_id}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}