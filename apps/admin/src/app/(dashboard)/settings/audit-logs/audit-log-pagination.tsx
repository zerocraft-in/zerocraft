import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@zerocraft/ui/button";
import { CardFooter } from "@zerocraft/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@zerocraft/ui/pagination";
import { cn } from "@/lib/utils";

import {
  buildAuditLogsHref,
  type AuditLogFilters,
} from "./audit-log-filters";

type PageItem = number | "ellipsis";

type AuditLogPaginationProps = {
  page: number;
  totalPages: number;
  totalCount: number;
  filters: AuditLogFilters;
};

/**
 * Builds a compact page list: first, last, and the current page plus its
 * neighbours. Gaps are rendered as ellipses.
 */
function buildPageItems(current: number, total: number): PageItem[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const candidates = new Set<number>([
    1,
    total,
    current - 1,
    current,
    current + 1,
  ]);

  const pages = [...candidates]
    .filter((value) => value >= 1 && value <= total)
    .sort((left, right) => left - right);

  const items: PageItem[] = [];
  let previous = 0;

  for (const value of pages) {
    if (previous > 0 && value - previous > 1) {
      items.push("ellipsis");
    }
    items.push(value);
    previous = value;
  }

  return items;
}

function DisabledPaginationLink({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      role="link"
      aria-disabled="true"
      aria-label={label}
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "pointer-events-none opacity-50",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function AuditLogPagination({
  page,
  totalPages,
  totalCount,
  filters,
}: AuditLogPaginationProps) {
  const items = buildPageItems(page, totalPages);

  return (
    <CardFooter className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        {totalCount === 0
          ? "No events to show"
          : `Page ${page} of ${totalPages} · ${totalCount} ${
              totalCount === 1 ? "event" : "events"
            }`}
      </p>

      {totalPages > 1 ? (
        <Pagination className="mx-0 w-auto justify-start sm:justify-end">
          <PaginationContent>
            <PaginationItem>
              {page > 1 ? (
                <PaginationPrevious
                  href={buildAuditLogsHref(page - 1, filters)}
                />
              ) : (
                <DisabledPaginationLink
                  label="Go to previous page"
                  className="pl-1.5!"
                >
                  <ChevronLeft className="size-4" />
                  <span className="hidden sm:block">Previous</span>
                </DisabledPaginationLink>
              )}
            </PaginationItem>

            {items.map((item, index) =>
              item === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={item}>
                  <PaginationLink
                    href={buildAuditLogsHref(item, filters)}
                    isActive={item === page}
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}

            <PaginationItem>
              {page < totalPages ? (
                <PaginationNext
                  href={buildAuditLogsHref(page + 1, filters)}
                />
              ) : (
                <DisabledPaginationLink
                  label="Go to next page"
                  className="pr-1.5!"
                >
                  <span className="hidden sm:block">Next</span>
                  <ChevronRight className="size-4" />
                </DisabledPaginationLink>
              )}
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </CardFooter>
  );
}
