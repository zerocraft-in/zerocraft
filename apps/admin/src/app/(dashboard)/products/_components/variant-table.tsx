"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zerocraft/ui/table";
import { Button } from "@zerocraft/ui/button";
import { Input } from "@zerocraft/ui/input";
import { Checkbox } from "@zerocraft/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@zerocraft/ui/dialog";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  REQUIRED_PRICE,
  cleanValues,
  isValidPrice,
  isValidQty,
  sanitizePrice,
  validateVariant,
  variantTitle,
  variantValueLabels,
  type BuilderAction,
  type ProductOption,
  type Variant,
  type VariantErrors,
  type VariantFields,
} from "../lib/variant-builder";

type Filter = "all" | "no-price" | "in-stock" | "out-of-stock" | "errors";
type BulkMode = "price" | "quantity" | "delete" | null;

const selectClass =
  "h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

/* ───────────────────────── small inputs ───────────────────────── */
function PriceInput({
  value,
  onChange,
  onBlur,
  invalid,
  title,
  placeholder = "0.00",
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  title?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-1" title={title}>
      <span className="text-xs text-muted-foreground">₹</span>
      <Input
        value={value}
        inputMode="decimal"
        placeholder={placeholder}
        onChange={(e) => onChange(sanitizePrice(e.target.value))}
        onBlur={onBlur}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-9 w-full min-w-0 text-sm",
          invalid && "border-destructive",
        )}
      />
    </div>
  );
}

function QtyInput({
  value,
  onChange,
  invalid,
  disabled,
  title,
}: {
  value: string;
  onChange?: (v: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <Input
      value={value}
      inputMode="numeric"
      disabled={disabled}
      title={title}
      onChange={(e) => onChange?.(e.target.value.replace(/\D/g, ""))}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-9 w-full min-w-0 text-right text-sm",
        invalid && "border-destructive",
      )}
    />
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/* ───────────────────────── edit variant dialog ───────────────────────── */
function EditVariantDialog({
  variant,
  title,
  isSkuTaken,
  onSave,
  onClose,
}: {
  variant: Variant;
  title: string;
  isSkuTaken: (sku: string) => boolean;
  onSave: (patch: VariantFields) => void;
  onClose: () => void;
}) {
  const [d, setD] = React.useState<VariantFields>({
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
    sku: variant.sku,
    barcode: variant.barcode,
    quantity: variant.quantity,
  });
  const [attempted, setAttempted] = React.useState(false);
  const errs = validateVariant(d, isSkuTaken(d.sku));
  const show = (m?: string) =>
    m && (attempted || m !== REQUIRED_PRICE) ? m : undefined;
  const set = (patch: Partial<VariantFields>) =>
    setD((p) => ({ ...p, ...patch }));

  const save = () => {
    setAttempted(true);
    if (Object.keys(errs).length > 0) return;
    onSave({
      ...d,
      price: d.price.trim(),
      compareAtPrice: d.compareAtPrice.trim(),
      sku: d.sku.trim(),
      barcode: d.barcode.trim(),
      quantity: d.quantity.trim() || "0",
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Edit variant</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price" error={show(errs.price)}>
            <PriceInput
              value={d.price}
              onChange={(v) => set({ price: v })}
              invalid={!!show(errs.price)}
            />
          </Field>
          <Field label="Compare-at price" error={show(errs.compareAtPrice)}>
            <PriceInput
              value={d.compareAtPrice}
              onChange={(v) => set({ compareAtPrice: v })}
              invalid={!!errs.compareAtPrice}
            />
          </Field>
          <Field label="SKU" error={show(errs.sku)}>
            <Input
              value={d.sku}
              onChange={(e) => set({ sku: e.target.value })}
              aria-invalid={!!errs.sku}
              className={cn("h-9 text-sm", errs.sku && "border-destructive")}
            />
          </Field>
          <Field label="Barcode">
            <Input
              value={d.barcode}
              onChange={(e) => set({ barcode: e.target.value })}
              className="h-9 text-sm"
            />
          </Field>
          <Field label="Available quantity" error={show(errs.quantity)}>
            <QtyInput
              value={d.quantity}
              onChange={(v) => set({ quantity: v })}
              invalid={!!errs.quantity}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={save}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── bulk dialog ───────────────────────── */
function BulkDialog({
  mode,
  count,
  onClose,
  onApply,
}: {
  mode: BulkMode;
  count: number;
  onClose: () => void;
  onApply: (mode: Exclude<BulkMode, null>, value: string) => void;
}) {
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const apply = () => {
    if (!mode) return;
    if (mode === "price" && !isValidPrice(value))
      return setError("Enter a valid price.");
    if (mode === "quantity" && !isValidQty(value))
      return setError("Enter a whole number.");
    onApply(mode, value.trim());
  };

  const noun = `${count} variant${count === 1 ? "" : "s"}`;

  return (
    <Dialog open={mode !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "delete"
              ? `Delete ${noun}?`
              : mode === "price"
                ? "Set price"
                : "Set available quantity"}
          </DialogTitle>
          <DialogDescription>
            {mode === "delete"
              ? "These variants will be removed. This can't be undone."
              : `Applies to ${noun}.`}
          </DialogDescription>
        </DialogHeader>
        {mode === "price" && (
          <Field label="Price" error={error ?? undefined}>
            <PriceInput value={value} onChange={setValue} invalid={!!error} />
          </Field>
        )}
        {mode === "quantity" && (
          <Field label="Available" error={error ?? undefined}>
            <QtyInput value={value} onChange={setValue} invalid={!!error} />
          </Field>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={mode === "delete" ? "destructive" : "default"}
            onClick={apply}
          >
            {mode === "delete" ? "Delete variants" : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── table ───────────────────────── */
interface VariantTableProps {
  options: ProductOption[];
  variants: Variant[];
  errors: Record<string, VariantErrors>;
  dispatch: React.Dispatch<BuilderAction>;
}

export function VariantTable({
  options,
  variants,
  errors,
  dispatch,
}: VariantTableProps) {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");
  const [groupBy, setGroupBy] = React.useState(""); // "" = first option, "none" = no grouping
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [touched, setTouched] = React.useState<Set<string>>(new Set());
  const [editKey, setEditKey] = React.useState<string | null>(null);
  const [bulk, setBulk] = React.useState<BulkMode>(null);

  const activeOptions = React.useMemo(
    () => options.filter((o) => cleanValues(o).length > 0),
    [options],
  );

  const q = query.trim().toLowerCase();
  const filtered = variants.filter((v) => {
    if (q && !`${variantTitle(v, options)} ${v.sku}`.toLowerCase().includes(q))
      return false;
    switch (filter) {
      case "no-price":
        return !v.price.trim();
      case "in-stock":
        return Number(v.quantity) > 0;
      case "out-of-stock":
        return !(Number(v.quantity) > 0);
      case "errors":
        return !!errors[v.key];
      default:
        return true;
    }
  });

  const selectedKeys = variants
    .filter((v) => selected.has(v.key))
    .map((v) => v.key);
  const selectedCount = selectedKeys.length;

  const groupOption =
    activeOptions.length >= 2 && groupBy !== "none"
      ? (activeOptions.find((o) => o.id === groupBy) ?? activeOptions[0])
      : null;

  const toggleKeys = (keys: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => (on ? next.add(k) : next.delete(k)));
      return next;
    });

  const allSelected =
    filtered.length > 0 && filtered.every((v) => selected.has(v.key));
  const someSelected = filtered.some((v) => selected.has(v.key));

  const patch = (key: string, p: Partial<VariantFields>) =>
    dispatch({ type: "UPDATE_VARIANT", key, patch: p });
  const touch = (key: string) => setTouched((prev) => new Set(prev).add(key));

  const errorOf = (v: Variant, field: keyof VariantErrors) => {
    const m = errors[v.key]?.[field];
    if (!m) return undefined;
    return m === REQUIRED_PRICE && !touched.has(v.key) ? undefined : m;
  };

  /* groups */
  type Group = { id: string; label: string; items: Variant[] };
  const groups: Group[] | null = (() => {
    if (!groupOption) return null;
    const map = new Map<string, Group>();
    for (const v of filtered) {
      const s = v.selections.find((x) => x.optionId === groupOption.id);
      if (!s) continue;
      const label =
        groupOption.values.find((x) => x.id === s.valueId)?.label.trim() ?? "";
      if (!map.has(s.valueId))
        map.set(s.valueId, { id: s.valueId, label, items: [] });
      map.get(s.valueId)!.items.push(v);
    }
    return [...map.values()];
  })();

  const editing = editKey ? variants.find((v) => v.key === editKey) : undefined;
  const totalInventory = variants.reduce(
    (n, v) => n + (Number(v.quantity) || 0),
    0,
  );
  const errorCount = Object.keys(errors).length;

  const handleBulkApply = (mode: Exclude<BulkMode, null>, value: string) => {
    if (mode === "delete") {
      dispatch({ type: "DELETE_VARIANTS", keys: selectedKeys });
      setSelected(new Set());
    } else if (mode === "price") {
      dispatch({
        type: "BULK_UPDATE",
        keys: selectedKeys,
        patch: { price: value },
      });
    } else {
      dispatch({
        type: "BULK_UPDATE",
        keys: selectedKeys,
        patch: { quantity: value },
      });
    }
    setBulk(null);
  };

  /* rows */
  const renderVariantRow = (v: Variant, nested: boolean) => {
    const label = nested
      ? variantValueLabels(v, options, groupOption?.id).join(" / ")
      : variantTitle(v, options);
    return (
      <TableRow
        key={v.key}
        data-state={selected.has(v.key) ? "selected" : undefined}
      >
        <TableCell className="w-10">
          <Checkbox
            checked={selected.has(v.key)}
            onCheckedChange={(c) => toggleKeys([v.key], c === true)}
            aria-label={`Select ${label}`}
          />
        </TableCell>
        <TableCell className={cn("max-w-0", nested && "pl-8")}>
          <p className="truncate text-sm font-medium" title={label}>
            {label || "—"}
          </p>
          {v.sku && (
            <p
              className={cn(
                "truncate text-xs",
                errorOf(v, "sku")
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              SKU: {v.sku}
            </p>
          )}
        </TableCell>
        <TableCell className="w-40">
          <PriceInput
            value={v.price}
            onChange={(val) => patch(v.key, { price: val })}
            onBlur={() => touch(v.key)}
            invalid={!!errorOf(v, "price")}
            title={errorOf(v, "price")}
          />
        </TableCell>
        <TableCell className="w-32">
          <QtyInput
            value={v.quantity}
            onChange={(val) => patch(v.key, { quantity: val })}
            invalid={!!errorOf(v, "quantity")}
            title={errorOf(v, "quantity")}
          />
        </TableCell>
        <TableCell className="w-14">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Edit ${label}`}
            onClick={() => setEditKey(v.key)}
            className="h-8 w-8"
          >
            <Pencil className="size-4" />
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  const renderGroup = (g: Group) => {
    const open = !!q || expanded.has(g.id);
    const keys = g.items.map((v) => v.key);
    const all = keys.every((k) => selected.has(k));
    const prices = new Set(g.items.map((v) => v.price));
    const commonPrice = prices.size === 1 ? g.items[0].price : "";
    const total = g.items.reduce((n, v) => n + (Number(v.quantity) || 0), 0);

    return (
      <React.Fragment key={g.id}>
        <TableRow data-state={all ? "selected" : undefined}>
          <TableCell className="w-10">
            <Checkbox
  checked={all}
  onCheckedChange={() => toggleKeys(keys, !all)}
  aria-label={`Select ${g.label}`}
/>
          </TableCell>
          <TableCell className="max-w-0">
            <button
              type="button"
              className="flex w-full min-w-0 items-center gap-2 text-left"
              onClick={() =>
                setExpanded((prev) => {
                  const next = new Set(prev);
                  if (next.has(g.id)) next.delete(g.id);
                  else next.add(g.id);
                  return next;
                })
              }
              aria-expanded={open}
            >
              {open ? (
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0">
                <span
                  className="block truncate text-sm font-medium"
                  title={g.label}
                >
                  {g.label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {g.items.length} variant{g.items.length === 1 ? "" : "s"}
                </span>
              </span>
            </button>
          </TableCell>
          <TableCell className="w-40">
            <PriceInput
              value={commonPrice}
              placeholder={prices.size > 1 ? "Mixed" : "0.00"}
              onChange={(val) =>
                dispatch({ type: "BULK_UPDATE", keys, patch: { price: val } })
              }
            />
          </TableCell>
          <TableCell className="w-32">
            <QtyInput
              value={String(total)}
              disabled
              title="Edit quantities per variant"
            />
          </TableCell>
          <TableCell className="w-14" />
        </TableRow>
        {open && g.items.map((v) => renderVariantRow(v, true))}
      </React.Fragment>
    );
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* toolbar */}
      {selectedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/50 p-3">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBulk("price")}
          >
            Set price
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBulk("quantity")}
          >
            Set quantity
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={() => setBulk("delete")}
          >
            <Trash2 className="mr-1.5 size-3.5" />
            Delete variants
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelected(new Set())}
          >
            <X className="mr-1 size-3.5" />
            Clear
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search variants or SKU"
              className="h-9 pl-8 text-sm"
              aria-label="Search variants"
            />
          </div>
          <select
            className={selectClass}
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            aria-label="Filter variants"
          >
            <option value="all">All variants</option>
            <option value="no-price">No price</option>
            <option value="in-stock">In stock</option>
            <option value="out-of-stock">Out of stock</option>
            <option value="errors">Has errors</option>
          </select>
          {activeOptions.length >= 2 && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Group by
              <select
                className={selectClass}
                value={groupOption?.id ?? "none"}
                onChange={(e) => setGroupBy(e.target.value)}
              >
                {activeOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name.trim() || "Untitled option"}
                  </option>
                ))}
                <option value="none">No grouping</option>
              </select>
            </label>
          )}
        </div>
      )}

      {/* table */}
      <Table className="min-w-[620px] table-fixed">
        <TableHeader>
          <TableRow className="bg-muted/40 text-xs">
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                data-state={
                  allSelected
                    ? "checked"
                    : someSelected
                      ? "indeterminate"
                      : "unchecked"
                }
                onCheckedChange={() =>
                  toggleKeys(
                    filtered.map((v) => v.key),
                    !allSelected,
                  )
                }
                aria-label="Select all variants"
                disabled={filtered.length === 0}
              />
            </TableHead>
            <TableHead>Variant</TableHead>
            <TableHead className="w-40">Price</TableHead>
            <TableHead className="w-32 text-right">Available</TableHead>
            <TableHead className="w-14" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                No variants match your search or filter.
              </TableCell>
            </TableRow>
          ) : groups ? (
            groups.map(renderGroup)
          ) : (
            filtered.map((v) => renderVariantRow(v, false))
          )}
        </TableBody>
      </Table>

      {/* footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
        <span>
          {variants.length} variant{variants.length === 1 ? "" : "s"} · Total
          inventory: {totalInventory} available
        </span>
        {errorCount > 0 && (
          <button
            type="button"
            className="text-destructive underline-offset-2 hover:underline"
            onClick={() => setFilter("errors")}
          >
            {errorCount} variant{errorCount === 1 ? "" : "s"} need attention
          </button>
        )}
      </div>

      {editing && (
        <EditVariantDialog
          key={editing.key}
          variant={editing}
          title={variantTitle(editing, options)}
          isSkuTaken={(sku) =>
            !!sku.trim() &&
            variants.some(
              (o) =>
                o.key !== editing.key &&
                o.sku.trim().toLowerCase() === sku.trim().toLowerCase(),
            )
          }
          onSave={(p) => {
            patch(editing.key, p);
            touch(editing.key);
            setEditKey(null);
          }}
          onClose={() => setEditKey(null)}
        />
      )}

      <BulkDialog
        key={bulk ?? "closed"}
        mode={bulk}
        count={selectedCount}
        onClose={() => setBulk(null)}
        onApply={handleBulkApply}
      />
    </div>
  );
}
