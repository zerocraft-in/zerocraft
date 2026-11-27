import { formatPaise, paise } from "@/lib/money";

export type ProductOption = {
  id: string;
  public_id: number;
  product_id?: string;
  name: string;
  position: 1 | 2 | 3;
  values: string[];
};

export type ProductImage = {
  id: string;
  public_id: number;
  product_id?: string;
  variant_ids: string[];
  src: string;
  alt: string | null;
  position: number;
  width: number | null;
  height: number | null;
};

export type Collection = {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  image_src: string | null;
  sort_order: string;
  published_at: string | null;
  published_scope: "web" | "global";
};

export type VariantRow = {
  id: string;
  public_id: number;
  product_id?: string;
  sku: string;
  barcode: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  cost_price_paise: number;
  selling_price_paise: number;
  compare_at_price_paise: number | null;
  cost_per_item_paise: number;
  tax_rate_bps: number | null;
  track_quantity: boolean;
  quantity: number;
  continue_selling_when_out_of_stock: boolean;
  weight_grams: number | null;
  weight_unit: "g" | "kg" | "oz" | "lb";
  requires_shipping: boolean;
  is_active: boolean;
  reorder_point: number;
  created_at: string;
  updated_at: string;
};

export type ProductBaseRow = {
  id: string;
  public_id: number;
  organization_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  status: "draft" | "active" | "archived";
  handle: string;
  vendor: string | null;
  product_type: string | null;
  tags: string[];
  tax_rate_bps: number;
  is_tax_inclusive: boolean;
  requires_shipping: boolean;
  weight_grams: number | null;
  weight_unit: "g" | "kg" | "oz" | "lb";
  hs_code: string | null;
  country_of_origin: string | null;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  published_scope: "web" | "global";
  created_at: string;
  updated_at: string;
};

export type ProductRow = ProductBaseRow & {
  variants: VariantRow[];
  product_options: ProductOption[];
  product_images: ProductImage[];
  collections: Collection[];
};

export type StatusFilter = "all" | "draft" | "active" | "archived";

export type ProductFormInput = {
  name: string;
  description?: string;
  status?: "draft" | "active";
  handle?: string;
  vendor?: string;
  product_type?: string;
  tags?: string[];
  tax_rate_percent?: string;
  is_tax_inclusive?: boolean;
  requires_shipping?: boolean;
  weight_grams?: string;
  weight_unit?: "g" | "kg" | "oz" | "lb";
  hs_code?: string;
  country_of_origin?: string;
  seo_title?: string;
  seo_description?: string;
  published_scope?: "web" | "global";
  options?: Array<{ name: string; values: string[] }>;
};

export type VariantFormValues = {
  sku: string;
  barcode: string;
  option1: string;
  option2: string;
  option3: string;
  cost_price: string;
  selling_price: string;
  compare_at_price: string;
  cost_per_item: string;
  tax_rate_percent: string;
  track_quantity: boolean;
  quantity: string;
  continue_selling_when_out_of_stock: boolean;
  weight_grams: string;
  weight_unit: "g" | "kg" | "oz" | "lb";
  requires_shipping: boolean;
};

export function formatTax(bps: number): string {
  const percent = bps / 100;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(2)}%`;
}

export function statusBadgeVariant(
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

export function formatMoney(value: number): string {
  return formatPaise(paise(Number(value)));
}

export function variantDimensions(variant: VariantRow): string {
  const parts = [variant.option1, variant.option2, variant.option3].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "—";
}

export function getInventoryStatus(variant: VariantRow): {
  status: "in_stock" | "low_stock" | "out_of_stock" | "not_tracked";
  label: string;
} {
  if (!variant.track_quantity) {
    return { status: "not_tracked", label: "Not tracked" };
  }
  if (variant.quantity <= 0) {
    return { status: "out_of_stock", label: "Out of stock" };
  }
  if (variant.quantity <= (variant.reorder_point || 10)) {
    return { status: "low_stock", label: `Low stock (${variant.quantity})` };
  }
  return { status: "in_stock", label: `In stock (${variant.quantity})` };
}
