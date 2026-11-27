import { createColumnHelper } from "@tanstack/react-table";

import { Badge } from "@zerocraft/ui/badge";
import { Checkbox } from "@zerocraft/ui/checkbox";
import Link from "next/link";
import Image from "next/image";
import type { ProductRow, VariantRow } from "../types";
import { statusBadgeVariant } from "../types";

export type ProductColumnCtx = {
  canUpdate: boolean;
  canArchive: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onStatusChange: (id: string, status: "draft" | "active") => void;
  onArchive: (id: string, name: string) => void;
  onSelect: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  isSelected: (id: string) => boolean;
  allSelected: boolean;
  someSelected: boolean;
  indeterminate: boolean;
};

const columnHelper = createColumnHelper<ProductRow>();

function getInventoryStatus(variants: VariantRow[]): {
  status: "in_stock" | "low_stock" | "out_of_stock" | "not_tracked";
  label: string;
  total: number;
} {
  const trackQuantity = variants.some((v) => v.track_quantity);
  const total = variants.reduce(
    (sum, v) => sum + (v.track_quantity ? v.quantity : 0),
    0,
  );
  if (!trackQuantity) {
    return { status: "not_tracked", label: "Not tracked", total };
  }
  if (variants.some((v) => v.quantity <= 0)) {
    return { status: "out_of_stock", label: `${total} in stock`, total };
  }
  if (
    variants.some(
      (v) => v.quantity > 0 && v.quantity <= (v.reorder_point || 10),
    )
  ) {
    return { status: "low_stock", label: `${total} in stock`, total };
  }
  return { status: "in_stock", label: `${total} in stock`, total };
}

function formatDateShort(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTimeShort(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
}

export function buildColumns(ctx: ProductColumnCtx) {
  const {
    onSelect,
    onSelectAll,
    isSelected,
    allSelected,
    indeterminate,
  } = ctx;

  return [
    columnHelper.accessor("id", {
      id: "selection",
      header: () => (
        <Checkbox
          checked={allSelected}
          indeterminate={indeterminate}
          onCheckedChange={(checked) => onSelectAll(!!checked)}
          aria-label="Select all products"

        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={isSelected(row.original.id)}
          onCheckedChange={() => onSelect(row.original.id)}
          aria-label={`Select ${row.original.name}`}
    
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
      minSize: 40,
      maxSize: 60,
    }),
    columnHelper.accessor("id", {
      id: "product",
      header: "Product",
      cell: ({ row }) => {
        const product = row.original;
        const firstImage = row.original.product_images[0];
        return (
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex size-10 shrink-0 items-center justify-center rounded bg-muted">
              {firstImage ? (
                <Image
                  fill
                  src={firstImage.src}
                  alt={firstImage.alt ?? product.name}
                  className="size-10 rounded object-cover"
                />
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </div>
            <div className="min-w-0">
              <Link href={`/products/${product.public_id}`} className="hover:underline font-medium text-body truncate">
                {product.name}
              </Link>
            </div>
          </div>
        );
      },
      enableSorting: false,
      size: 260,
      minSize: 200,
      maxSize: Number.MAX_SAFE_INTEGER,
    }),
    columnHelper.accessor("status", {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="flex items-center gap-2 min-w-0">
            <Badge
              variant={statusBadgeVariant(product.status)}
              className="shrink-0"
            >
              {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
            </Badge>
          </div>
        );
      },
      size: 100,
      minSize: 80,
      maxSize: 150,
    }),
    columnHelper.accessor("variants", {
      id: "inventory",
      header: "Inventory",
      cell: ({ row }) => {
        const variants = row.original.variants;
        const status = getInventoryStatus(variants);
        const isDestructive = status.status === "out_of_stock";
        return (
          <span
            className={`shrink-0 whitespace-nowrap ${isDestructive ? "text-destructive" : "text-body"}`}
          >
            {status.label}
          </span>
        );
      },
      enableSorting: false,
      size: 120,
      minSize: 80,
      maxSize: 150,
    }),
    columnHelper.accessor("id", {
      id: "channels",
      header: "Channels",
      cell: ({ row }) => (
        <span className="text-muted-foreground shrink-0 whitespace-nowrap">
          {row.original.variants.length}
        </span>
      ),
      enableSorting: false,
      size: 80,
      minSize: 60,
      maxSize: 100,
    }),
    columnHelper.accessor("product_type", {
      id: "product_type",
      header: "Product type",
      cell: ({ getValue }) => (
        <span className="min-w-0 block overflow-hidden overflow-ellipsis whitespace-nowrap text-muted-foreground shrink-0">
          {getValue() ?? "—"}
        </span>
      ),
      size: 120,
      minSize: 80,
      maxSize: 200,
    }),
    columnHelper.accessor("vendor", {
      id: "vendor",
      header: "Vendor",
      cell: ({ getValue }) => (
        <span className="min-w-0 block overflow-hidden overflow-ellipsis whitespace-nowrap text-muted-foreground shrink-0">
          {getValue() ?? "—"}
        </span>
      ),
      size: 120,
      minSize: 80,
      maxSize: 200,
    }),
    columnHelper.accessor("created_at", {
      id: "created_at",
      header: "Created",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground whitespace-nowrap shrink-0">
          {formatDateShort(getValue() as string)}
        </span>
      ),
      size: 120,
      minSize: 100,
      maxSize: 150,
    }),
    columnHelper.accessor("updated_at", {
      id: "updated_at",
      header: "Updated",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground whitespace-nowrap shrink-0">
          {formatDateTimeShort(getValue() as string)}
        </span>
      ),
      size: 140,
      minSize: 120,
      maxSize: 180,
    }),
  ];
}
