"use client";

import {
  flexRender,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type TableState,
} from "@tanstack/react-table";

import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zerocraft/ui/table";

import { ROW_MODELS } from "./data-table-features";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;
  enableSorting?: boolean;
  enablePagination?: boolean;
  className?: string;
  selectedProducts?: string[];
  selectedCustomers?: Set<string> | undefined;
  emptyState?: React.ReactNode;
  /** Optional toolbar rendered at the top of the table (e.g. bulk-selection bar). */
  toolbar?: React.ReactNode;
}

export function DataTable<TData>({
  columns,
  data,
  sorting,
  onSortingChange,
  pagination,
  onPaginationChange,
  enableSorting = true,
  enablePagination = true,
  selectedProducts = [],
  selectedCustomers,
  className,
  emptyState = (
    <div className="text-muted-foreground text-center py-8">No data found.</div>
  ),
  toolbar,
}: DataTableProps<TData>) {
  const selectedCount = selectedProducts.length + (selectedCustomers?.size ?? 0);
  const table = useReactTable<TData>({
    columns,
    data,
    state: {
      sorting: sorting ?? [],
      pagination,
    } as TableState,
    onStateChange: (updater) => {
      const patch =
        typeof updater === "function" ? updater({} as TableState) : updater;
      if (patch.sorting) onSortingChange(patch.sorting);
      if (patch.pagination) onPaginationChange(patch.pagination);
    },
    getCoreRowModel: ROW_MODELS.getCoreRowModel,
    ...(enableSorting
      ? { getSortedRowModel: ROW_MODELS.getSortedRowModel }
      : {}),
    ...(enablePagination
      ? { getPaginationRowModel: ROW_MODELS.getPaginationRowModel }
      : {}),
    manualPagination: enablePagination,
  });

  const renderSortIndicator = (id: string) => {
    const column = table.getColumn(id);
    if (!column) return null;
    const isSorted = column.getIsSorted();
    if (isSorted === "asc") return <ChevronUp className="h-3 w-3" />;
    if (isSorted === "desc") return <ChevronDown className="h-3 w-3" />;
    return <ChevronsUpDown className="h-3 w-3 opacity-50" />;
  };

  const visibleLeafColumns = table.getVisibleLeafColumns();

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          {selectedCount > 0 ? (
            <TableRow>
              <TableHead colSpan={visibleLeafColumns.length}>
                {toolbar}
              </TableHead>
            </TableRow>
          ) : (
            <>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{ width: header.column.getSize() }}
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center gap-2">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}

                          {enableSorting && header.column.getCanSort() ? (
                            <button
                              onClick={(event) => {
                                header.column.getToggleSortingHandler()?.(
                                  event,
                                );
                              }}
                              aria-label={`Sort by ${header.id}`}
                              disabled={!header.column.getCanSort()}
                              className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full text-xs text-muted-foreground transition-colors hover:text-body focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50"
                            >
                              {renderSortIndicator(header.id)}
                            </button>
                          ) : null}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </>
          )}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={table.getAllColumns().length}
                className="text-center"
              >
                {emptyState}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    style={{ width: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
