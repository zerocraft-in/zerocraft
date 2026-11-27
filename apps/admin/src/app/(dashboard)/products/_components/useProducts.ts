"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import type { ProductRow, StatusFilter } from "../types";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

type SortField =
  | "name"
  | "created_at"
  | "updated_at"
  | "status"
  | "vendor"
  | "product_type";
type SortDirection = "asc" | "desc";

export function useProducts(organizationId: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ---- URL-synced filter state ----
  const [searchQuery, setSearchQuery] = React.useState(
    () => searchParams.get("q") ?? "",
  );
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>(
    () => (searchParams.get("status") ?? "all") as StatusFilter,
  );
  const [vendorFilter, setVendorFilter] = React.useState(
    () => searchParams.get("vendor") ?? "",
  );
  const [productTypeFilter, setProductTypeFilter] = React.useState(
    () => searchParams.get("product_type") ?? "",
  );
  const [pageIndex, setPageIndex] = React.useState(() => {
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    return page - 1;
  });
  const [pageSize, setPageSize] = React.useState(() => {
    const size = Number(searchParams.get("page_size")) || DEFAULT_PAGE_SIZE;
    return PAGE_SIZE_OPTIONS.includes(size) ? size : DEFAULT_PAGE_SIZE;
  });
  const [sortField, setSortField] = React.useState<SortField>(() => {
    const valid: SortField[] = [
      "name",
      "created_at",
      "updated_at",
      "status",
      "vendor",
      "product_type",
    ];
    const raw = (searchParams.get("sort") ?? "created_at") as SortField;
    return valid.includes(raw) ? raw : "created_at";
  });
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(() =>
    searchParams.get("dir") === "asc" ? "asc" : "desc",
  );

  const [hiddenColumnIds, setHiddenColumnIds] = React.useState<string[]>([]);

  // Push filter/sort/pagination state to the URL without scrolling.
  React.useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (statusFilter && statusFilter !== "all")
      params.set("status", statusFilter);
    if (vendorFilter) params.set("vendor", vendorFilter);
    if (productTypeFilter) params.set("product_type", productTypeFilter);
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
    searchQuery,
    statusFilter,
    vendorFilter,
    productTypeFilter,
    pageIndex,
    pageSize,
    sortField,
    sortDirection,
    pathname,
    router,
  ]);

  // ---- Fetch products ----
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [vendors, setVendors] = React.useState<string[]>([]);
  const [productTypes, setProductTypes] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/products?organization_id=${organizationId}`,
        );
        if (!response.ok) throw new Error("Failed to load products");
        const data = await response.json();
        setProducts(data.products);
        setVendors(data.vendors);
        setProductTypes(data.productTypes);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load products",
        );
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, [organizationId]);

  // ---- Client-side filtering (persisted in URL) ----
  const filteredProducts = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        query.length === 0 ||
        product.name.toLowerCase().includes(query) ||
        (product.description ?? "").toLowerCase().includes(query) ||
        (product.vendor ?? "").toLowerCase().includes(query) ||
        (product.product_type ?? "").toLowerCase().includes(query) ||
        product.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        product.variants.some(
          (variant) =>
            variant.sku.toLowerCase().includes(query) ||
            (variant.barcode ?? "").toLowerCase().includes(query),
        );
      const matchesStatus =
        statusFilter === "all" || product.status === statusFilter;
      const matchesVendor = !vendorFilter || product.vendor === vendorFilter;
      const matchesProductType =
        !productTypeFilter || product.product_type === productTypeFilter;
      return (
        matchesSearch && matchesStatus && matchesVendor && matchesProductType
      );
    });
  }, [products, searchQuery, statusFilter, vendorFilter, productTypeFilter]);

  return {
    // State
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    vendorFilter,
    setVendorFilter,
    productTypeFilter,
    setProductTypeFilter,
    pageIndex,
    setPageIndex,
    pageSize,
    setPageSize,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    hiddenColumnIds,
    setHiddenColumnIds,
    // Data
    products,
    vendors,
    productTypes,
    loading,
    error,
    filteredProducts,
  };
}
