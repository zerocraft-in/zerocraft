"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  archiveProduct,
  setProductStatus,
} from "../actions";
import { toast } from "@zerocraft/ui/toast";
import { Button } from "@zerocraft/ui/button";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@zerocraft/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@zerocraft/ui/empty";
import { Search, Filter, Plus, MoreHorizontal } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@zerocraft/ui/select";
import { Input } from "@zerocraft/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@zerocraft/ui/dropdown-menu";

import { DataTable } from "./data-table";
import { buildColumns, type ProductColumnCtx } from "./columns";
import type { ColumnDef } from "@tanstack/react-table";
import type { ProductRow, StatusFilter } from "../types";

import { useProducts } from "./useProducts";
import { useProductSelection } from "./useProductSelection";
import { BulkToolbar } from "./BulkToolbar";

type ProductTableColumns = ColumnDef<ProductRow, unknown>[];

interface ProductsManagerProps {
  organizationId: string;
  permissions: Set<string>;
}

type SortField =
  | "name"
  | "created_at"
  | "updated_at"
  | "status"
  | "vendor"
  | "product_type";

export default function ProductsManager({
  organizationId,
  permissions,
}: ProductsManagerProps) {
  const router = useRouter();
  const canCreate = permissions.has("products.create");
  const canUpdate = permissions.has("products.update");
  const canArchive = permissions.has("products.archive");

  const {
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
    products,
    vendors,
    productTypes,
    loading,
    error,
    filteredProducts,
  } = useProducts(organizationId);

  const {
    selectedProducts,
    allSelected,
    someSelected,
    handleSelectAll,
    handleSelectProduct,
    isSelected,
    handleClearSelection,
  } = useProductSelection(filteredProducts.map((p) => p.id));

  const handleBulkEdit = () => {
    if (selectedProducts.length === 0) return;
    router.push(`/products/${selectedProducts[0]}`);
    toast.add({
      title: `Edit ${selectedProducts.length} selected product(s).`,
      type: "info",
    });
  };

  const handleArchive = async (productId: string, productName: string) => {
    if (!window.confirm(`Archive "${productName}"?`)) return;

    try {
      const result = await archiveProduct({ id: productId });
      if (result.ok) {
        toast.add({ title: "Product archived.", type: "success" });
        router.refresh();
      } else {
        toast.add({ title: result.error, type: "error" });
      }
    } catch {
      toast.add({ title: "Failed to archive product.", type: "error" });
    }
  };

  const handleStatusChange = async (
    productId: string,
    status: "draft" | "active",
  ) => {
    try {
      const result = await setProductStatus({ id: productId, status });
      if (result.ok) {
        toast.add({
          title: status === "active" ? "Product published." : "Product set to draft.",
          type: "success",
        });
        router.refresh();
      } else {
        toast.add({ title: result.error, type: "error" });
      }
    } catch {
      toast.add({ title: "Failed to change product status.", type: "error" });
    }
  };

  const [showAllSelected] = React.useState(false);

  const displayProducts = showAllSelected
    ? products.filter((p) => selectedProducts.includes(p.id))
    : filteredProducts;

  const handleSortChange = (sorting: { id: string; desc: boolean }[]) => {
    const [s] = sorting;
    if (!s) return;
    setSortField(
      [
        "name",
        "created_at",
        "updated_at",
        "status",
        "vendor",
        "product_type",
      ].includes(s.id) ? (s.id as SortField) : "created_at",
    );
    setSortDirection(s.desc ? "desc" : "asc");
  };

  const columnsCtx: ProductColumnCtx = {
    canUpdate,
    canArchive,
    onView: (id) => router.push(`/products/${id}`),
    onEdit: (id) => router.push(`/products/${id}`),
    onStatusChange: handleStatusChange,
    onArchive: handleArchive,
    onSelect: handleSelectProduct,
    onSelectAll: handleSelectAll,
    isSelected,
    allSelected,
    someSelected,
    indeterminate: someSelected,
  };

  const allColumns = buildColumns(columnsCtx);
  const columns = allColumns.filter(
    (c) => c.id && !hiddenColumnIds.includes(c.id),
  );

  const tableColumns: ProductTableColumns = columns as ProductTableColumns;

  const sorting = [{ id: sortField, desc: sortDirection === "desc" }];
  const pagination = { pageIndex, pageSize };

  if (loading) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col px-5 py-6 sm:px-8 sm:py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col px-5 py-6 sm:px-8 sm:py-10">
        <Card>
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

  const bulkToolbar = (
    <BulkToolbar
      selectedProducts={selectedProducts}
      allSelected={allSelected}
      someSelected={someSelected}
      canUpdate={canUpdate}
      canArchive={canArchive}
      onSelectAll={handleSelectAll}
      onClearSelection={handleClearSelection}
      onBulkEdit={handleBulkEdit}
      onRefresh={() => router.refresh()}
    />
  );

  return (
    <div className="relative mx-auto flex flex-col px-4 py-10 space-y-6">
      <div className="flex flex-col gap-2.5">
        <Card className="overflow-hidden space-y-0! py-0! gap-0">
          <CardHeader className="p-1.5!">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger className="w-auto">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative flex-1 min-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {vendors.length > 0 && (
                  <Select
                    value={vendorFilter}
                    onValueChange={(value) => setVendorFilter(value ?? "")}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="All vendors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All vendors</SelectItem>
                      {vendors.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {productTypes.length > 0 && (
                  <Select
                    value={productTypeFilter}
                    onValueChange={(value) => setProductTypeFilter(value ?? "")}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All types</SelectItem>
                      {productTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="outline" className="gap-2">
                        <Filter className="size-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-56 p-2">
                    {[
                      { key: "product", label: "Product" },
                      { key: "status", label: "Status" },
                      { key: "inventory", label: "Inventory" },
                      { key: "category", label: "Category" },
                      { key: "channels", label: "Channels" },
                      { key: "product_type", label: "Product type" },
                      { key: "vendor", label: "Vendor" },
                      { key: "created_at", label: "Created" },
                      { key: "updated_at", label: "Updated" },
                    ].map((col) => {
                      const hidden = hiddenColumnIds.includes(col.key);
                      return (
                        <DropdownMenuCheckboxItem
                          key={col.key}
                          checked={!hidden}
                          onCheckedChange={() => {
                            setHiddenColumnIds((prev) =>
                              hidden
                                ? prev.filter((id) => id !== col.key)
                                : [...prev, col.key],
                            );
                          }}
                        >
                          {col.label}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Products Table */}
        <Card className="overflow-hidden space-y-0! py-0! gap-0">
          <CardContent className="overflow-x-auto px-0 py-0">
            <DataTable
              columns={tableColumns}
              data={displayProducts}
              sorting={sorting}
              onSortingChange={handleSortChange}
              pagination={pagination}
              onPaginationChange={(next) => {
                setPageIndex(next.pageIndex);
                setPageSize(next.pageSize);
              }}
              toolbar={selectedProducts.length > 0 ? bulkToolbar : undefined}
              className="overflow-x-auto"
              selectedProducts={selectedProducts}
              emptyState={
                <Empty className="border-0 p-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <MoreHorizontal className="size-12 text-muted-foreground/50" />
                    </EmptyMedia>
                    <EmptyTitle>No products found</EmptyTitle>
                    <EmptyDescription>
                      {searchQuery ||
                      statusFilter !== "all" ||
                      vendorFilter ||
                      productTypeFilter
                        ? "Try adjusting your search or filters."
                        : "Get started by adding your first product."}
                    </EmptyDescription>
                  </EmptyHeader>
                  {canCreate &&
                    !searchQuery &&
                    statusFilter === "all" &&
                    !vendorFilter &&
                    !productTypeFilter && (
                      <EmptyContent>
                        <Button onClick={() => router.push("/products/new")}>
                          <Plus className="size-4 mr-2" />
                          Add product
                        </Button>
                      </EmptyContent>
                    )}
                </Empty>
              }
            />
          </CardContent>

          <CardFooter>
            {filteredProducts.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {Math.min(pageIndex * pageSize + 1, filteredProducts.length)}
                    -{" "}
                    {Math.min((pageIndex + 1) * pageSize, filteredProducts.length)}
                    of {filteredProducts.length}
                  </span>
                </div>
              </div>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
