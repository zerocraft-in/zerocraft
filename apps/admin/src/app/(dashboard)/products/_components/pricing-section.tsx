"use client";

import * as React from "react";
import type {
  FieldValues,
  Path,
  PathValue,
  UseFormReturn,
} from "react-hook-form";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, HelpCircle, Check } from "lucide-react";

import { Card, CardContent } from "@zerocraft/ui/card";
import { Checkbox } from "@zerocraft/ui/checkbox";
import { Label } from "@zerocraft/ui/label";
import { Button } from "@zerocraft/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@zerocraft/ui/popover";
import { PriceInput } from "@/components/ui/price-input";

// ─── Unit options ─────────────────────────────────────────────────────────────
type UnitOption = { label: string; value: string };

const UNIT_OPTIONS: UnitOption[] = [
  { label: "Milligram (mg)", value: "mg" },
  { label: "Gram (g)", value: "g" },
  { label: "Kilogram (kg)", value: "kg" },
  { label: "Milliliter (ml)", value: "ml" },
  { label: "Centiliter (cl)", value: "cl" },
  { label: "Liter (L)", value: "L" },
  { label: "Cubic meter (m³)", value: "m³" },
  { label: "Millimeter (mm)", value: "mm" },
  { label: "Centimeter (cm)", value: "cm" },
  { label: "Meter (m)", value: "m" },
  { label: "Square meter (m²)", value: "m²" },
  { label: "Item (item)", value: "item" },
];

// ─── Types ────────────────────────────────────────────────────────────────────
// Bug fix: cost field added to match form schema (page.tsx registers cost field)
type PricingFields = FieldValues & {
  price?: string;
  compare_at_price?: string;
  cost?: string;
  unit_price?: string;
  is_tax_inclusive: boolean;
};

type UnitPriceState = {
  totalAmount: string;
  totalUnit: string;
  baseMeasure: string;
  baseUnit: string;
};

type ProductPricingSectionProps<T extends PricingFields> = {
  form: UseFormReturn<T>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Bug fix: PriceInput (Indian-formatted) emits comma-free raw string via onChange,
 * but form.watch() may return the formatted string with commas if set externally.
 * Always strip commas before Number() conversion.
 */
function toNumber(val: string | number | undefined | null): number {
  if (val === undefined || val === null || val === "") return 0;
  return Number(String(val).replace(/,/g, "")) || 0;
}

/**
 * Format a number as Indian currency string (no symbol).
 * e.g. 122000 → "1,22,000.00"
 */
function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// ─── Main component ───────────────────────────────────────────────────────────
export function PricingSection<T extends PricingFields>({
  form,
}: ProductPricingSectionProps<T>) {
  const [additionalOpen, setAdditionalOpen] = React.useState(false);
  // Track whether the panel is fully open (after animation) to toggle overflow
  const [panelSettled, setPanelSettled] = React.useState(false);

  // Unit price panel (Popover-driven)
  const [unitPanelOpen, setUnitPanelOpen] = React.useState(false);
  const [unitPriceDraft, setUnitPriceDraft] = React.useState<UnitPriceState>({
    totalAmount: "",
    totalUnit: "g",
    baseMeasure: "1",
    baseUnit: "kg",
  });
  const [savedUnitPrice, setSavedUnitPrice] =
    React.useState<UnitPriceState | null>(null);

  // Scroll-to refs
  const compareAtRef = React.useRef<HTMLDivElement>(null);
  const unitPriceRef = React.useRef<HTMLDivElement>(null);
  const taxRef = React.useRef<HTMLDivElement>(null);
  const costRef = React.useRef<HTMLDivElement>(null);

  // Form field paths
  const priceField = "price" as Path<T>;
  const compareAtField = "compare_at_price" as Path<T>;
  const costField = "cost_per_item" as Path<T>;
  const taxField = "is_tax_inclusive" as Path<T>;

  // Bug fix: use toNumber() everywhere — strips Indian-format commas before parsing
  const price = toNumber(form.watch(priceField));
  const compareAtRaw = String(form.watch(compareAtField) ?? "");
  const compareAtPrice = toNumber(compareAtRaw);
  const cost = toNumber(form.watch(costField));
  const chargeTax = Boolean(form.watch(taxField));

  // Calculations — all from form fields, no local cost state needed
  const profit = price - cost;
  const margin = price > 0 ? (profit / price) * 100 : 0;

  // Bug fix: unit price label shows calculated price-per-unit
  // "₹X.XX / baseMeasure baseUnit"  — where X = price / (totalAmount in base units)
  const unitPriceLabel = React.useMemo(() => {
    if (!savedUnitPrice) return "--";
    const totalAmt = toNumber(savedUnitPrice.totalAmount);
    const baseAmt = toNumber(savedUnitPrice.baseMeasure) || 1;
    if (totalAmt <= 0) return "--";
    // Price per base unit = price / (totalAmt / baseAmt)
    const perUnit = price > 0 ? (price / totalAmt) * baseAmt : 0;
    return `₹${formatINR(perUnit)} / ${savedUnitPrice.baseMeasure} ${savedUnitPrice.baseUnit}`;
  }, [savedUnitPrice, price]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const openAndFocus = (
    ref: React.RefObject<HTMLDivElement | null>,
    isUnitPrice = false,
  ) => {
    setAdditionalOpen(true);
    if (isUnitPrice) {
      window.setTimeout(() => setUnitPanelOpen(true), 350);
      return;
    }
    window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.querySelector<HTMLElement>(
        'input:not([type="hidden"]), button[role="checkbox"]',
      )?.focus({ preventScroll: true });
    }, 350);
  };

  const handleUnitPanelOpen = () => {
    if (savedUnitPrice) setUnitPriceDraft({ ...savedUnitPrice });
    setUnitPanelOpen(true);
  };

  const handleUnitPanelSave = () => {
    setSavedUnitPrice({ ...unitPriceDraft });
    // Bug fix: also write structured string to form field unit_price
    // so it's available in form.getValues() / submit payload
    const totalAmt = toNumber(unitPriceDraft.totalAmount);
    const unitPriceStr =
      totalAmt > 0
        ? `${unitPriceDraft.totalAmount} ${unitPriceDraft.totalUnit} / ${unitPriceDraft.baseMeasure} ${unitPriceDraft.baseUnit}`
        : "";
    form.setValue(
      "unit_price" as Path<T>,
      unitPriceStr as PathValue<T, Path<T>>,
      {
        shouldDirty: true,
      },
    );
    setUnitPanelOpen(false);
  };

  const handleUnitPanelClear = () => {
    setSavedUnitPrice(null);
    setUnitPriceDraft({
      totalAmount: "",
      totalUnit: "g",
      baseMeasure: "1",
      baseUnit: "kg",
    });
    form.setValue("unit_price" as Path<T>, "" as PathValue<T, Path<T>>, {
      shouldDirty: true,
    });
    setUnitPanelOpen(false);
  };

  const handleUnitPanelCancel = () => setUnitPanelOpen(false);

  const setMoneyField = (field: Path<T>, value: string) => {
    form.setValue(field, value as PathValue<T, Path<T>>, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const isSaveEnabled = unitPriceDraft.totalAmount.trim() !== "";

  // ── Collapsed tag values ──────────────────────────────────────────────────
  // Bug fix: use toNumber(compareAtRaw) so Indian-formatted strings parse correctly
  const compareAtTagValue =
    compareAtPrice > 0 ? `₹${formatINR(compareAtPrice)}` : undefined;
  const unitPriceTagValue = savedUnitPrice ? unitPriceLabel : undefined;
  // Bug fix: cost from form field (not local state)
  const costTagValue = cost > 0 ? `₹${formatINR(cost)}` : undefined;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-gray-900">Price</h2>

      <Card className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Main price */}
        <CardContent className="px-4 pt-4 pb-4">
          <PriceInput
            id="price"
            placeholder="0.00"
            name={String(priceField)}
            value={String(form.watch(priceField) ?? "")}
            onChange={(event) => setMoneyField(priceField, event.target.value)}
            onBlur={() => void form.trigger(priceField)}
          />
        </CardContent>

        <div className="border-t border-gray-200" />

        {/* Collapsed summary row OR "Additional display prices" label */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          {additionalOpen ? (
            <span className="text-sm font-medium text-[#1a6951]">
              Additional display prices
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <SummaryTag
                label="Compare-at"
                value={compareAtTagValue}
                onClick={() => openAndFocus(compareAtRef)}
              />
              <SummaryTag
                label="Unit price"
                value={unitPriceTagValue}
                onClick={() => openAndFocus(unitPriceRef, true)}
              />
              <SummaryTag
                label="Charge tax"
                value={chargeTax ? "Yes" : undefined}
                onClick={() => openAndFocus(taxRef)}
              />
              <SummaryTag
                label="Cost per item"
                value={costTagValue}
                onClick={() => openAndFocus(costRef)}
              />
            </div>
          )}

          <button
            type="button"
            aria-expanded={additionalOpen}
            onClick={() => {
              setAdditionalOpen((p) => {
                if (p) setPanelSettled(false); // closing → reset settled
                return !p;
              });
            }}
            className="ml-auto shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {additionalOpen ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>
        </div>

        {/*
          Bug fix: overflow strategy
          - During open animation  → overflow: hidden  (clean height reveal)
          - After fully open       → overflow: visible (Popovers escape correctly)
          - During close animation → overflow: hidden  (clean collapse)
          Achieved by toggling via onAnimationComplete / onAnimationStart.
        */}
        <AnimatePresence initial={false}>
          {additionalOpen && (
            <motion.div
              key="expanded"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                height: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 0.18 },
              }}
              style={{
                overflow: panelSettled ? "visible" : "hidden",
              }}
              onAnimationComplete={(def) => {
                // "animate" definition completed = fully open
                if (def === "animate") setPanelSettled(true);
              }}
              onAnimationStart={(def) => {
                // Any animation starting = hide overflow to prevent flash
                if (def === "exit") setPanelSettled(false);
              }}
            >
              <div className="border-t border-gray-200 px-4 pb-5 pt-4 space-y-5">
                {/* 2-col: Compare-at + Unit price */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Compare-at price */}
                  <div ref={compareAtRef} className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label
                        htmlFor="compare_at_price"
                        className="text-sm font-medium text-gray-800"
                      >
                        Compare-at price
                      </Label>
                      <HelpCircle className="size-3.5 text-gray-400" />
                    </div>
                    <PriceInput
                      id="compare_at_price"
                      placeholder="0.00"
                      name={String(compareAtField)}
                      value={String(form.watch(compareAtField) ?? "")}
                      onChange={(event) =>
                        setMoneyField(compareAtField, event.target.value)
                      }
                      onBlur={() => void form.trigger(compareAtField)}
                    />
                  </div>

                  {/* Unit price — full Popover portal, never clips */}
                  <div ref={unitPriceRef} className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-800">
                      Unit price
                    </Label>

                    <Popover
                      open={unitPanelOpen}
                      onOpenChange={(o) => {
                        if (o) handleUnitPanelOpen();
                        else handleUnitPanelCancel();
                      }}
                    >
                      <PopoverTrigger
                        className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:border-gray-400 transition-colors"
                      >
                        <span
                          className={
                            savedUnitPrice ? "text-gray-900" : "text-gray-400"
                          }
                        >
                          {unitPriceLabel}
                        </span>
                        <ChevronDown className="size-4 text-gray-400 shrink-0" />
                      </PopoverTrigger>

                      <PopoverContent
                        align="start"
                        side="bottom"
                        sideOffset={6}
                        collisionPadding={12}
                        className="w-72 rounded-xl border border-gray-200 bg-white shadow-lg p-4 space-y-4"
                      >
                        {/* Total amount */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Total amount
                          </Label>
                          <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              value={unitPriceDraft.totalAmount}
                              onChange={(e) =>
                                setUnitPriceDraft((d) => ({
                                  ...d,
                                  totalAmount: e.target.value,
                                }))
                              }
                              className="flex-1 min-w-0 px-3 py-2 text-sm outline-none bg-white"
                            />
                            <UnitDropdown
                              value={unitPriceDraft.totalUnit}
                              options={UNIT_OPTIONS}
                              onChange={(v) =>
                                setUnitPriceDraft((d) => ({
                                  ...d,
                                  totalUnit: v,
                                }))
                              }
                              compact
                            />
                          </div>
                        </div>

                        {/* Base measure */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Base measure
                          </Label>
                          <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={unitPriceDraft.baseMeasure}
                              onChange={(e) =>
                                setUnitPriceDraft((d) => ({
                                  ...d,
                                  baseMeasure: e.target.value,
                                }))
                              }
                              className="flex-1 min-w-0 px-3 py-2 text-sm outline-none bg-white"
                            />
                            <UnitDropdown
                              value={unitPriceDraft.baseUnit}
                              options={UNIT_OPTIONS}
                              onChange={(v) =>
                                setUnitPriceDraft((d) => ({
                                  ...d,
                                  baseUnit: v,
                                }))
                              }
                              compact
                            />
                          </div>
                        </div>

                        {/* Clear / Cancel / Save */}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={handleUnitPanelClear}
                            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            Clear
                          </button>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleUnitPanelCancel}
                              className="h-8 px-3 text-sm"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={!isSaveEnabled}
                              onClick={handleUnitPanelSave}
                              className="h-8 px-3 text-sm bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40"
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Charge tax */}
                <div ref={taxRef} className="flex items-center gap-2.5">
                  <Checkbox
                    id="is_tax_inclusive"
                    checked={chargeTax}
                    className="rounded data-[state=checked]:bg-[#1a6951] data-[state=checked]:border-[#1a6951]"
                    onCheckedChange={(checked) => {
                      form.setValue(
                        taxField,
                        (checked === true) as PathValue<T, Path<T>>,
                        { shouldDirty: true, shouldValidate: true },
                      );
                    }}
                  />
                  <Label
                    htmlFor="is_tax_inclusive"
                    className="cursor-pointer text-sm font-normal text-gray-800"
                  >
                    Charge tax on this product
                  </Label>
                </div>

                <div className="border-t border-gray-200" />

                {/* Cost / Profit / Margin
                    Bug fix: cost is now a form field (registered via form.register),
                    not local useState — stays in sync with form state & submit payload */}
                <div
                  ref={costRef}
                  className="flex items-center gap-5 flex-wrap"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 whitespace-nowrap">
                      Cost
                    </span>
                    {/* Bug fix: use PriceInput for consistent Indian formatting */}
                    <PriceInput
                      id="cost"
                      placeholder="0.00"
                      className="w-32 max-w-32"
                      name={String(costField)}
                      value={String(form.watch(costField) ?? "")}
                      onChange={(event) => setMoneyField(costField, event.target.value)}
                      onBlur={() => void form.trigger(costField)}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Profit</span>
                    <span className="text-sm font-medium text-gray-800">
                      {cost > 0 || price > 0
                        ? `${profit >= 0 ? "+" : ""}₹${formatINR(profit)}`
                        : "—"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Margin</span>
                    <span className="text-sm font-medium text-gray-800">
                      {price > 0
                        ? `${margin >= 0 ? "+" : ""}${margin.toFixed(0)}%`
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </section>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Collapsed summary pill — click opens panel and focuses that field */
function SummaryTag({
  label,
  value,
  onClick,
}: {
  label: string;
  value?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
    >
      {label}
      {value !== undefined && (
        <span className="font-semibold text-gray-900">{value}</span>
      )}
    </button>
  );
}

/**
 * Unit selector used inside the unit price panel.
 * Rendered via Popover portal — never clips against parent overflow.
 */
function UnitDropdown({
  value,
  options,
  onChange,
  compact,
}: {
  value: string;
  options: UnitOption[];
  onChange: (v: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={`flex items-center gap-1 border-l border-gray-300 bg-gray-50 px-2.5 py-2 text-gray-700 hover:bg-gray-100 transition-colors whitespace-nowrap ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        {value}
        <ChevronDown className="size-3 text-gray-400" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={4}
        collisionPadding={8}
        className="w-44 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg p-1"
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              onChange(opt.value);
              setOpen(false);
            }}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
          >
            <span
              className={
                value === opt.value
                  ? "font-medium text-gray-900"
                  : "text-gray-700"
              }
            >
              {opt.label}
            </span>
            {value === opt.value && (
              <Check className="size-3.5 text-gray-700" />
            )}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
