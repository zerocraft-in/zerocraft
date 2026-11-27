"use client";

import * as React from "react";
import { type UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardFooter } from "@zerocraft/ui/card";
import { Input } from "@zerocraft/ui/input";
import { Label } from "@zerocraft/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zerocraft/ui/select";
import { Switch } from "@zerocraft/ui/switch";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@zerocraft/ui/collapsible";
import { Badge } from "@zerocraft/ui/badge";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import type { ProductFormValues } from "@/app/(dashboard)/products/lib/product-schema";

type ProductForm = UseFormReturn<ProductFormValues>;

interface ShippingCardProps {
  form: ProductForm;
  shippingOpen: boolean;
  setShippingOpen: (open: boolean) => void;
}

export function ShippingCard({
  form,
  shippingOpen,
  setShippingOpen,
}: ShippingCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Shipping</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              {form.watch("requires_shipping")
                ? "Physical product"
                : "Not a physical product"}
            </span>
            <Switch
              checked={form.watch("requires_shipping")}
              onCheckedChange={(v) =>
                form.setValue("requires_shipping", v)
              }
              size="sm"
            />
          </div>
        </div>
      </CardHeader>
      {form.watch("requires_shipping") && (
        <>
          <CardContent className="space-y-4">
            <div className="space-y-2 grid grid-cols-2">
              <Label htmlFor="package-when-shipped">
                Package when shipped alone
              </Label>
              <div className="max-w-md w-full overflow-hidden">
                <Select defaultValue="Store default - Sample box - 22 × 13.7 × 4.2 cm, 0 kg">
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Store default" />
                  </SelectTrigger>
                  <SelectContent className={""}>
                    <SelectItem value="Store default - Sample box - 22 × 13.7 × 4.2 cm, 0 kg">
                      Store default - Sample box - 22 × 13.7 × 4.2 cm,
                      0 kg
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 grid grid-cols-2">
              <div className="flex items-center gap-1 text-sm">
                <Label htmlFor="packed-size">
                  Packed product size
                </Label>
                <Info className="size-2.5 text-muted-foreground" />
              </div>
              <div className="flex items-center max-w-md gap-2">
                <Input
                  id="packed-l"
                  type="number"
                  step="0.1"
                  placeholder="L 0.0"
                  className="flex-1 text-sm"
                  value={form.watch("packed_length")}
                  onChange={(e) =>
                    form.setValue("packed_length", e.target.value)
                  }
                />
                <span className="text-muted-foreground text-sm">
                  ×
                </span>
                <Input
                  id="packed-w"
                  type="number"
                  step="0.1"
                  placeholder="W 0.0"
                  className="flex-1 text-sm"
                  value={form.watch("packed_width")}
                  onChange={(e) =>
                    form.setValue("packed_width", e.target.value)
                  }
                />
                <span className="text-muted-foreground text-sm">
                  ×
                </span>
                <Input
                  id="packed-h"
                  type="number"
                  step="0.1"
                  placeholder="H 0.0"
                  className="flex-1 text-sm"
                  value={form.watch("packed_height")}
                  onChange={(e) =>
                    form.setValue("packed_height", e.target.value)
                  }
                />
                <Select
                  value={form.watch("dimension_unit")}
                  onValueChange={(v) =>
                    form.setValue(
                      "dimension_unit",
                      (v ?? "cm") as "cm" | "in",
                    )
                  }
                  defaultValue="cm"
                >
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cm">cm</SelectItem>
                    <SelectItem value="in">in</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 grid grid-cols-2">
              <div className="flex items-center gap-1 text-sm">
                <Label htmlFor="weight">Weight</Label>
                <Info className="size-2.5 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="weight"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0.0"
                  className="flex-1 text-sm"
                  {...form.register("weight")}
                />
                <Select
                  value={form.watch("weight_unit")}
                  onValueChange={(v) =>
                    form.setValue(
                      "weight_unit",
                      (v ?? "g") as "g" | "kg" | "oz" | "lb",
                    )
                  }
                  defaultValue="g"
                >
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="oz">oz</SelectItem>
                    <SelectItem value="lb">lb</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-between gap-2 p-4">
            <Collapsible
              open={shippingOpen}
              onOpenChange={setShippingOpen}
              className="w-full"
            >
              <CollapsibleTrigger className="w-full flex items-center justify-between">
                {shippingOpen ? (
                  <>
                    <div
                      className="flex flex-row items-center justify-between w-full cursor-pointer group"
                      onClick={() => setShippingOpen(false)}
                    >
                      <p className="text-sm font-medium">
                        More details
                      </p>
                      <ChevronUp className="size-4 text-muted-foreground group-hover:text-body shrink-0" />
                    </div>
                  </>
                ) : (
                  <div
                    className="flex items-center justify-between w-full cursor-pointer group"
                    onClick={() => setShippingOpen(true)}
                  >
                    <div className="flex gap-2">
                      <Badge
                        variant="outline"
                        className="text-xs px-2.5 py-1"
                      >
                        Country of origin
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-xs px-2.5 py-1"
                      >
                        HS Code
                      </Badge>
                    </div>
                    <ChevronDown className="size-4 text-muted-foreground group-hover:text-body shrink-0" />
                  </div>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2">
                  {shippingOpen && (
                    <div className="mt-3 space-y-4">
                      <div className="space-y-2 flex flex-col">
                        <Label htmlFor="shipping-country">
                          Country/Region of origin
                        </Label>
                        <Input
                          id="shipping-country"
                          placeholder="ISO code (e.g., IN, US, CN)"
                          maxLength={2}
                          className="text-sm uppercase"
                          {...form.register("country_of_origin")}
                        />
                      </div>
                      <div className="space-y-2 flex flex-col">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2 flex">
                            <Label htmlFor="shipping-hs">
                              Harmonized System (HS) code
                            </Label>
                            <Info className="size-2.5 text-muted-foreground" />
                          </div>
                        </div>
                        <Input
                          id="shipping-hs"
                          placeholder="Enter a 6-digit code or search by keyword"
                          className="text-sm"
                          {...form.register("hs_code")}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
