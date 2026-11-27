"use client"

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
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

import { buildColumns, type AuditLogDisplayRow } from "./columns";
import { DEFAULT_SORTING } from "./data-table-features";

interface DataTableProps {
  data: AuditLogDisplayRow[];
  timeZone: string | undefined;
  actorNames: Record<string, string | null>;
  initialSorting?: SortingState;
  enableSorting?: boolean;
  className?: string;
  emptyState?: React.ReactNode;
}

export function DataTable({
  data,
  timeZone,
  actorNames,
  initialSorting,
  enableSorting = true,
  className,
  emptyState = (
    <div className="text-muted-foreground text-center py-8">
      No data found.
    </div>
  ),
}: DataTableProps) {
  const columns = buildColumns({
    timeZone,
    actorNames: new Map(Object.entries(actorNames)),
  });

  const table = useReactTable<AuditLogDisplayRow>({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    ...(enableSorting
      ? {
          getSortedRowModel: getSortedRowModel(),
          initialState: {
            sorting: initialSorting ?? DEFAULT_SORTING,
          },
        }
      : {}),
  });

  const renderSortIndicator = (id: string) => {
    const column = table.getColumn(id);
    if (!column) return null;
    const isSorted = column.getIsSorted();
    if (isSorted === "asc") return <ChevronUp className="h-3 w-3" />;
    if (isSorted === "desc") return <ChevronDown className="h-3 w-3" />;
    return <ChevronsUpDown className="h-3 w-3 opacity-50" />;
  };

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id} style={{ width: header.column.getSize() }}>
                    {header.isPlaceholder ? null : (
                      <div className="flex items-center gap-2">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {enableSorting && header.column.getCanSort() ? (
                          <button
                            onClick={(event) => {
                              header.column.getToggleSortingHandler()?.(event);
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
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center">
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
