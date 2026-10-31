"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  IconAdjustmentsHorizontal,
  IconCheck,
  IconColumns3,
  IconFilter,
  IconSearch,
  IconSortAscending,
  IconX,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type WorkspaceView = { id: string; label: string; count?: number };
export type WorkspaceFilter = { id: string; label: string; options: string[] };

type DataTableWorkspaceProps = {
  views: WorkspaceView[];
  activeView: string;
  onViewChange: (view: string) => void;
  query: string;
  onQueryChange: (query: string) => void;
  filters?: WorkspaceFilter[];
  activeFilters?: Record<string, string>;
  onFiltersChange?: (filters: Record<string, string>) => void;
  columns?: Array<{ id: string; label: string; visible: boolean }>;
  onColumnChange?: (id: string, visible: boolean) => void;
  selectedCount?: number;
  onClearSelection?: () => void;
  bulkActions?: ReactNode;
  sortOptions?: Array<{ id: string; label: string }>;
  activeSort?: string;
  onSortChange?: (sort: string) => void;
  onCreateView?: () => void;
  children: ReactNode;
  empty?: ReactNode;
  className?: string;
};

export function DataTableWorkspace({
  views,
  activeView,
  onViewChange,
  query,
  onQueryChange,
  filters = [],
  activeFilters = {},
  onFiltersChange,
  columns = [],
  onColumnChange,
  selectedCount = 0,
  onClearSelection,
  bulkActions,
  sortOptions = [],
  activeSort,
  onSortChange,
  onCreateView,
  children,
  empty,
  className,
}: DataTableWorkspaceProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;
  const selectedSort = sortOptions.find((item) => item.id === activeSort);

  useEffect(() => {
    if (!filters.length) setFiltersOpen(false);
  }, [filters.length]);

  function updateFilter(id: string, value: string) {
    onFiltersChange?.({ ...activeFilters, [id]: value === "all" ? "" : value });
  }

  return (
    <section className={cn("overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm", className)}>
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-2 pt-2">
        {views.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => onViewChange(view.id)}
            className={cn(
              "shrink-0 rounded-t-lg px-3 py-2 text-xs font-medium transition",
              activeView === view.id
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {view.label}
            {typeof view.count === "number" && <span className="ml-1.5 text-[11px] text-muted-foreground">{view.count}</span>}
          </button>
        ))}
        <button type="button" onClick={onCreateView} className="shrink-0 rounded-lg px-2 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">+ Create view</button>
      </div>

      {selectedCount > 0 ? (
        <div className="flex min-h-14 items-center gap-3 border-b border-border bg-primary/[0.06] px-4">
          <Checkbox checked={true} onCheckedChange={() => onClearSelection?.()} aria-label="Clear selection" />
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <div className="flex flex-wrap items-center gap-2">{bulkActions}</div>
          <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={onClearSelection}><IconX /> Clear</Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative min-w-[13rem] flex-1 sm:max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search" className="h-9 rounded-lg pl-9" />
          </div>
          {filters.length > 0 && <Button type="button" variant={filtersOpen || activeFilterCount ? "secondary" : "outline"} size="sm" onClick={() => setFiltersOpen((value) => !value)}><IconFilter /> Filters{activeFilterCount > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{activeFilterCount}</Badge>}</Button>}
          {sortOptions.length > 0 && <DropdownMenu><DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" />}><IconSortAscending />{selectedSort?.label ?? "Sort"}</DropdownMenuTrigger><DropdownMenuContent align="start"><DropdownMenuLabel>Sort by</DropdownMenuLabel><DropdownMenuSeparator />{sortOptions.map((option) => <DropdownMenuCheckboxItem key={option.id} checked={option.id === activeSort} onCheckedChange={() => onSortChange?.(option.id)}>{option.label}</DropdownMenuCheckboxItem>)}</DropdownMenuContent></DropdownMenu>}
          {columns.length > 0 && <DropdownMenu><DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" className="ml-auto" />}><IconColumns3 /> View</DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Columns</DropdownMenuLabel><DropdownMenuSeparator />{columns.map((column) => <DropdownMenuCheckboxItem key={column.id} checked={column.visible} onCheckedChange={(checked) => onColumnChange?.(column.id, checked === true)}>{column.label}</DropdownMenuCheckboxItem>)}</DropdownMenuContent></DropdownMenu>}
        </div>
      )}

      {filtersOpen && filters.length > 0 && <div className="grid gap-3 border-b border-border bg-muted/20 p-3 sm:grid-cols-3">{filters.map((filter) => <label key={filter.id} className="grid gap-1 text-xs font-medium text-muted-foreground"><span>{filter.label}</span><select value={activeFilters[filter.id] || "all"} onChange={(event) => updateFilter(filter.id, event.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm font-normal text-foreground outline-none focus:border-primary"><option value="all">All</option>{filter.options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>)}<Button type="button" variant="ghost" size="sm" className="self-end justify-self-start" onClick={() => onFiltersChange?.({})}><IconAdjustmentsHorizontal /> Reset filters</Button></div>}

      {empty ? <div className="p-6">{empty}</div> : <div className="overflow-x-auto">{children}</div>}
    </section>
  );
}

export function SelectAllCheckbox({ checked, onChange, label = "Select all" }: { checked: boolean; indeterminate?: boolean; onChange: (checked: boolean) => void; label?: string }) {
  return <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} aria-label={label} />;
}
