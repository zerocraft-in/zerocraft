"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@zerocraft/ui/button";
import { Input } from "@zerocraft/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@zerocraft/ui/select";

import {
  AUDIT_LOG_ENTITY_OPTIONS,
  AUDIT_LOG_SORT_OPTIONS,
  buildAuditLogsHref,
  hasActiveAuditLogFilters,
  isAuditLogEntity,
  isAuditLogSort,
  sanitizeSearchQuery,
  type AuditLogFilters,
} from "./audit-log-filters";

type AuditLogFiltersBarProps = {
  filters: AuditLogFilters;
};

export function AuditLogFiltersBar({ filters }: AuditLogFiltersBarProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState(filters.query);

  const navigate = React.useCallback(
    (next: Partial<AuditLogFilters>) => {
      router.push(buildAuditLogsHref(1, { ...filters, ...next }), {
        scroll: false,
      });
    },
    [filters, router],
  );

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate({ query: sanitizeSearchQuery(search) });
  };

  const handleClearSearch = () => {
    setSearch("");
    navigate({ query: "" });
  };

  const handleReset = () => {
    setSearch("");
    router.push("/audit-logs", { scroll: false });
  };

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center justify-between">
      <form
        onSubmit={handleSearchSubmit}
        role="search"
        className="relative w-full md:max-w-sm"
      >
        <button
          type="submit"
          aria-label="Submit search"
          className="absolute top-1/2 left-1 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Search className="size-4" />
        </button>

        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search actions or entities"
          aria-label="Search audit logs"
          className="pl-9 pr-8 [&::-webkit-search-cancel-button]:hidden"
        />

        {search ? (
          <button
            type="button"
            onClick={handleClearSearch}
            aria-label="Clear search"
            className="absolute top-1/2 right-1 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.entity}
          items={AUDIT_LOG_ENTITY_OPTIONS}
          onValueChange={(value) => {
            if (isAuditLogEntity(value)) {
              navigate({ entity: value });
            }
          }}
        >
          <SelectTrigger
            className="w-full md:w-40"
            aria-label="Filter by entity type"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AUDIT_LOG_ENTITY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.sort}
          items={AUDIT_LOG_SORT_OPTIONS}
          onValueChange={(value) => {
            if (isAuditLogSort(value)) {
              navigate({ sort: value });
            }
          }}
        >
          <SelectTrigger
            className="w-full md:w-36"
            aria-label="Sort audit logs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AUDIT_LOG_SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveAuditLogFilters(filters) ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
          >
            Reset
          </Button>
        ) : null}
      </div>
    </div>
  );
}
