"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@zerocraft/ui/card";
import { VariantEditor } from "@/app/(dashboard)/products/_components/variant-editor";
import type { VariantBuilderValue } from "../lib/variant-builder";

export function VariantsSection({
  value,
  onChange,
  resetKey,
  hideSingleVariantTable = false,
}: {
  value?: VariantBuilderValue;
  onChange: (value: VariantBuilderValue) => void;
  resetKey?: string;
  hideSingleVariantTable?: boolean;
}) {
  return (
    <div className="space-y-4">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Variants</CardTitle>
      </CardHeader>
      <Card>
        <CardContent>
          <VariantEditor
            key={resetKey ?? "new"}
            initialValue={value}
            onVariantChange={onChange}
            hideSingleVariantTable={hideSingleVariantTable}
          />
        </CardContent>
      </Card>
    </div>
  );
}
