"use client";

import { type UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@zerocraft/ui/card";
import { Input } from "@zerocraft/ui/input";
import { Label } from "@zerocraft/ui/label";
import type { ProductFormValues } from "@/app/(dashboard)/products/lib/product-schema";

type ProductForm = UseFormReturn<ProductFormValues>;

interface OrganizationCardProps {
  form: ProductForm;
}

export function OrganizationCard({ form }: OrganizationCardProps) {
  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="border-b px-0 pb-3 pt-0">
        <CardTitle className="text-sm font-semibold">
          Product organization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-0 pt-3">
        <div className="space-y-2">
          <Label htmlFor="product_type">Type</Label>
          <Input
            id="product_type"
            {...form.register("product_type")}
            placeholder="Add product type"
            className="bg-white"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vendor">Vendor</Label>
          <Input
            id="vendor"
            {...form.register("vendor")}
            placeholder="Add vendor"
            className="bg-white"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="collections">Collections</Label>
          <Input
            id="collections"
            placeholder="Add collections"
            className="bg-white"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            value={form.watch("tags").join(", ")}
            onChange={(event) =>
              form.setValue(
                "tags",
                event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean),
                { shouldDirty: true },
              )
            }
            placeholder="Add tags, separated by commas"
            className="bg-white"
          />
        </div>
      </CardContent>
    </Card>
  );
}
