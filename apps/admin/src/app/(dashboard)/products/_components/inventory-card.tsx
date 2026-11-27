"use client";

import * as React from "react";
import { type UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@zerocraft/ui/card";
import { Input } from "@zerocraft/ui/input";
import { Label } from "@zerocraft/ui/label";
import { Checkbox } from "@zerocraft/ui/checkbox";
import { Switch } from "@zerocraft/ui/switch";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@zerocraft/ui/collapsible";
import { Badge } from "@zerocraft/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ProductFormValues } from "@/app/(dashboard)/products/lib/product-schema";

type ProductForm = UseFormReturn<ProductFormValues>;

interface InventoryCardProps {
  form: ProductForm;
  inventoryOpen: boolean;
  setInventoryOpen: (open: boolean) => void;
}

export function InventoryCard({
  form,
  inventoryOpen,
  setInventoryOpen,
}: InventoryCardProps) {
  return (
    <Card className="">
      <CardHeader className="flex flex-row justify-between gap-2 py-0">
        <CardTitle className="text-sm">Inventory</CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {form.watch("track_quantity")
              ? "Inventory tracked"
              : "Not tracked"}
          </span>
          <Switch
            checked={form.watch("track_quantity")}
            onCheckedChange={(v) => form.setValue("track_quantity", v)}
            size="sm"
          />
        </div>
      </CardHeader>
      {form.watch("track_quantity") && (
        <CardContent className="m-2 rounded-lg border p-0">
          <div className="grid grid-cols-[minmax(150px,1.5fr)_repeat(4,minmax(68px,1fr))] items-center gap-3 rounded-t-lg bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
            <span>Locations</span>
            <span className="text-right">Unavailable</span>
            <span className="text-right">Committed</span>
            <span className="text-right">Available</span>
            <span className="text-right">On hand</span>
          </div>
          <div className="grid grid-cols-[minmax(150px,1.5fr)_repeat(4,minmax(68px,1fr))] items-center gap-3 border-t px-3 py-3 text-sm">
            <span>Shop location</span>
            <span className="text-right">0</span>
            <span className="text-right">0</span>
            <div className="flex justify-end">
              <Input
                id="quantity"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={form.watch("quantity")}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^\d+$/.test(val)) {
                    form.setValue("quantity", val);
                  }
                }}
                onBlur={() => {
                  if (form.watch("quantity") === "")
                    form.setValue("quantity", "0");
                }}
                aria-label="Available quantity at Shop location"
                className="h-8 w-[72px] text-right text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <span className="text-right">{Number(form.watch("quantity") || 0)}</span>
          </div>
          <div className="border-t px-3 py-2 text-sm">
            <button type="button" className="text-primary underline-offset-2 hover:underline">
              View adjustment history
            </button>
          </div>
        </CardContent>
      )}
      <CardFooter className="flex items-center justify-between gap-2 p-4">
        <Collapsible
          open={inventoryOpen}
          onOpenChange={setInventoryOpen}
          className="w-full"
        >
          <CollapsibleTrigger className="w-full flex items-center justify-between">
            {inventoryOpen ? (
              <>
                <div
                  className="flex flex-row items-center justify-between w-full cursor-pointer group"
                  onClick={() => setInventoryOpen(false)}
                >
                  <p className="text-sm font-medium">More details</p>
                  <ChevronUp className="size-4 text-muted-foreground group-hover:text-body shrink-0" />
                </div>
              </>
            ) : (
              <div
                className="flex items-center justify-between w-full cursor-pointer group"
                onClick={() => setInventoryOpen(true)}
              >
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs h-7 rounded-lg shrink-0">
                    SKU
                  </Badge>
                  <Badge variant="outline" className="text-xs h-7 rounded-lg shrink-0">
                    Barcodes
                  </Badge>
                  <Badge variant="outline" className="text-xs h-7 rounded-lg shrink-0">
                    Sell when out of stock{" "}
                    {form.watch("continue_selling_when_out_of_stock") ? "On" : "Off"}
                  </Badge>
                </div>
                <ChevronDown className="size-4 text-muted-foreground group-hover:text-body shrink-0" />
              </div>
            )}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2">
              {inventoryOpen && (
                <div className="mt-3 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label
                        htmlFor="inventory-sku"
                        className="text-sm text-muted-foreground"
                      >
                        SKU (Stock Keeping Unit)
                      </Label>
                      <Input
                        id="inventory-sku"
                        placeholder="SKU"
                        {...form.register("sku")}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label
                        htmlFor="inventory-barcodes"
                        className="text-sm text-muted-foreground"
                      >
                        Barcodes
                      </Label>
                      <Input
                        id="inventory-barcodes"
                        placeholder="ISBN, UPC, GTIN, etc."
                        {...form.register("barcode")}
                      />
                    </div>
                  </div>
                  {form.watch("track_quantity") && (
                    <div className="flex items-center gap-3 pt-2">
                      <Checkbox
                        id="continue-selling"
                        checked={form.watch(
                          "continue_selling_when_out_of_stock",
                        )}
                        onCheckedChange={(v) =>
                          form.setValue(
                            "continue_selling_when_out_of_stock",
                            v,
                          )
                        }
                      />
                      <label
                        htmlFor="continue-selling"
                        className="text-sm text-muted-foreground cursor-select-none"
                      >
                        Continue selling when out of stock
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardFooter>
    </Card>
  );
}
