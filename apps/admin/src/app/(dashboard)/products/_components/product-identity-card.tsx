"use client";

import * as React from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { Card, CardContent } from "@zerocraft/ui/card";
import { Button } from "@zerocraft/ui/button";
import { Input } from "@zerocraft/ui/input";
import { Label } from "@zerocraft/ui/label";
import Image from "next/image";
import type { ProductFormValues } from "@/app/(dashboard)/products/lib/product-schema";
import { RichTextEditor } from "@/components/tiptap/rich-text-editor";
import { CategoryPicker } from "./category-picker";

type ProductForm = UseFormReturn<ProductFormValues>;

interface ProductIdentityCardProps {
  form: ProductForm;
  selectedMedia: Array<{ id: string; url: string; name: string }>;
  setMediaPickerOpen: (open: boolean) => void;
  organizationId: string;
}

export function ProductIdentityCard({
  form,
  selectedMedia,
  setMediaPickerOpen,
  organizationId,
}: ProductIdentityCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-6 p-4">
        <div className="space-y-2">
          <Label htmlFor="name">Title</Label>
          <Input
            id="name"
            {...form.register("name")}
            placeholder="Short sleeve t-shirt"
            className="bg-white text-lg"
          />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">
              {(form.formState.errors.name as { message?: string })?.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Controller
            control={form.control}
            name="description"
            render={({ field, fieldState }) => (
              <RichTextEditor
                id="description"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={!!fieldState.error}
                placeholder="Describe your product..."
              />
            )}
          />
          {form.formState.errors.description && (
            <p className="text-sm text-destructive">
              {form.formState.errors.description.message}
            </p>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {selectedMedia.length > 0 ? (
              selectedMedia.map((media, index) => (
                <button
                  key={media.id || media.url}
                  type="button"
                  onClick={() => setMediaPickerOpen(true)}
                  className={index === 0
                    ? "relative h-60 w-60 overflow-hidden rounded-xl border border-[#c9c9c9] bg-[#f6f6f6]"
                    : "relative h-28 w-28 overflow-hidden rounded-xl border border-[#c9c9c9] bg-[#f6f6f6]"}
                  aria-label={`Edit ${media.name}`}
                >
                  <Image
                    fill
                    src={media.url}
                    alt={media.name}
                    className="object-cover"
                  />
                </button>
              ))
            ) : null}
            <button
              type="button"
              onClick={() => setMediaPickerOpen(true)}
              className="flex h-28 w-28 items-center justify-center rounded-xl border border-dashed border-[#8c9196] text-2xl text-[#616161] transition-colors hover:bg-[#f6f6f6]"
              aria-label="Add media"
            >
              +
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setMediaPickerOpen(true)}>Upload new</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setMediaPickerOpen(true)}>Select existing</Button>
            <p className="text-xs text-[#616161]">Accepts images, videos, or 3D models</p>
          </div>
        </div>
        <CategoryPicker form={form} organizationId={organizationId} />
      </CardContent>
    </Card>
  );
}
