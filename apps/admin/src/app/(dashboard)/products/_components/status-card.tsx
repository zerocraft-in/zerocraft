"use client";

import { type UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@zerocraft/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@zerocraft/ui/select";
import type { ProductFormValues } from "@/app/(dashboard)/products/lib/product-schema";

type ProductForm = UseFormReturn<ProductFormValues>;

interface StatusCardProps {
  form: ProductForm;
}

const STATUS_OPTIONS = [
  {
    value: "active",
    label: "Active",
    description: "Sell via selected sales channels and markets",
  },
  {
    value: "draft",
    label: "Draft",
    description: "Not visible on selected sales channels or markets",
  },
  {
    value: "archived",
    label: "Unlisted",
    description: "Accessible only by direct link",
  },
] as const;

export function StatusCard({ form }: StatusCardProps) {
  const status = form.watch("status");
  const selectedStatus =
    STATUS_OPTIONS.find((option) => option.value === status) ??
    STATUS_OPTIONS[0];

  const setStatus = (nextStatus: (typeof STATUS_OPTIONS)[number]["value"]) => {
    form.setValue("status", nextStatus, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  return (
    <Card className="border-0 bg-transparent shadow-none gap-2">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-[13px] font-medium leading-5 text-[#202223]">
          Status
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pt-0">
        <Select
          className="w-full"
          value={status}
          onValueChange={(v) => {
            if (v) setStatus(v as (typeof STATUS_OPTIONS)[number]["value"]);
          }}
        >
          <SelectTrigger className="h-9 w-full rounded-[10px] border-[#c9c9c9] bg-white px-2.5 text-[13px] font-normal text-[#202223] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-white">
            <SelectValue>{selectedStatus.label}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-[14px] border-[#d1d1d1] bg-white p-1 shadow-[0_4px_12px_rgba(0,0,0,0.16)]">
            {STATUS_OPTIONS.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                onAction={() => setStatus(option.value)}
                textValue={`${option.label}. ${option.description}`}
                className="min-h-[62px] rounded-[10px] py-2.5 pl-3 pr-9 text-[13px] text-[#202223] data-[selected]:bg-[#f6f6f6] data-focused:bg-[#f6f6f6]"
              >
                <span className="flex flex-col gap-0.5 whitespace-normal leading-[18px]">
                  <span className="font-normal">{option.label}</span>
                  <span className="max-w-[224px] text-[#5f6368]">
                    {option.description}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
