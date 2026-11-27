"use client";

import * as React from "react";
import { type UseFormReturn } from "react-hook-form";
import { slugify } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@zerocraft/ui/card";
import { Input } from "@zerocraft/ui/input";
import { Textarea } from "@zerocraft/ui/textarea";
import { Label } from "@zerocraft/ui/label";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@zerocraft/ui/collapsible";
import { Edit } from "lucide-react";
import type { ProductFormValues } from "@/app/(dashboard)/products/lib/product-schema";

type ProductForm = UseFormReturn<ProductFormValues>;

interface SeoSectionProps {
  form: ProductForm;
  seoOpen: boolean;
  setSeoOpen: (open: boolean) => void;
}

function toPlainText(value: string | undefined) {
  return (value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function SeoSection({ form, seoOpen, setSeoOpen }: SeoSectionProps) {
  const watchName = form.watch("name");
  const watchDescription = form.watch("description");
  const watchHandle = form.watch("handle");
  const watchPrice = form.watch("price");
  const watchSeoTitle = form.watch("seo_title");
  const watchSeoDescription = form.watch("seo_description");
  const [seoTitleEdited, setSeoTitleEdited] = React.useState(
    () => Boolean(form.getValues("seo_title")),
  );
  const [seoDescriptionEdited, setSeoDescriptionEdited] = React.useState(
    () => Boolean(form.getValues("seo_description")),
  );
  const [handleEdited, setHandleEdited] = React.useState(
    () => Boolean(form.getValues("handle")),
  );

  const productDescription = toPlainText(watchDescription);

  React.useEffect(() => {
    if (seoTitleEdited) return;

    const nextTitle = (form.getValues("name") ?? watchName ?? "").trim().slice(0, 70);
    if ((form.getValues("seo_title") ?? "") === nextTitle) return;

    form.setValue("seo_title", nextTitle, {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [form, seoOpen, seoTitleEdited, watchName]);

  React.useEffect(() => {
    if (seoDescriptionEdited) return;

    const nextDescription = toPlainText(
      form.getValues("description") ?? productDescription,
    ).slice(0, 160);
    if ((form.getValues("seo_description") ?? "") === nextDescription) return;

    form.setValue("seo_description", nextDescription, {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [form, productDescription, seoDescriptionEdited, seoOpen]);

  const listingTitle = watchSeoTitle?.trim() || watchName?.trim() || "Untitled product";
  const listingDescription = watchSeoDescription?.trim() || productDescription;
  const listingHandle = watchHandle || slugify(watchName) || "";
  const hasListingContent = Boolean(
    watchName?.trim() || watchDescription?.trim() || watchSeoTitle?.trim() || watchSeoDescription?.trim(),
  );
  const numericPrice = Number(watchPrice);
  const formattedPrice = watchPrice && Number.isFinite(numericPrice)
    ? `₹${numericPrice.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} INR`
    : "";

  React.useEffect(() => {
    if (handleEdited) return;

    const nextHandle = slugify(watchName ?? "");
    const currentHandle = form.getValues("handle") ?? "";
    if (!nextHandle || currentHandle === nextHandle) {
      return;
    }

    form.setValue("handle", nextHandle, {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [form, handleEdited, watchName]);

  const handleRegistration = form.register("handle", {
    onChange: (event) => {
      const nextValue = event.target.value;
      if (nextValue !== slugify(watchName ?? "")) {
        setHandleEdited(true);
      }
    },
  });
  const seoTitleRegistration = form.register("seo_title", {
    onChange: () => setSeoTitleEdited(true),
  });
  const seoDescriptionRegistration = form.register("seo_description", {
    onChange: () => setSeoDescriptionEdited(true),
  });

  return (
    <Collapsible
      open={seoOpen}
      onOpenChange={setSeoOpen}
      className="group/collapsible space-y-3 pb-20"
    >
      <CardHeader className="flex items-center justify-between px-0 py-0">
        <CardTitle className="text-[14px] font-medium leading-5 text-[#202223]">
          Search engine listing
        </CardTitle>
        <CollapsibleTrigger
          render={
            <button
              type="button"
              aria-label="Edit search engine listing"
              className="rounded-md p-1 text-[#5f6368] transition-colors hover:bg-[#f1f1f1] hover:text-[#202223]"
            >
              <Edit className="size-4" aria-hidden="true" />
            </button>
          }
        />
      </CardHeader>
      <Card className="overflow-hidden rounded-2xl border-[#e3e3e3] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
        {!seoOpen ? (
          <CardContent className="p-4">
            {hasListingContent ? (
              <div className="space-y-1">
                <p className="text-[14px] font-normal leading-5 text-[#202223]">maraapparels</p>
                <p className="truncate text-[12px] leading-4 text-[#5f6368]">
                  https://maraapparels.maara.co.in › products › {listingHandle}
                </p>
                <p className="text-[22px] font-normal leading-7 text-[#005bd3]">{listingTitle}</p>
                {listingDescription && (
                  <p className="line-clamp-2 text-[13px] leading-5 text-[#5f6368]">
                    {listingDescription}
                  </p>
                )}
                {formattedPrice && (
                  <p className="pt-1 text-[13px] leading-5 text-[#202223]">{formattedPrice}</p>
                )}
              </div>
            ) : (
              <p className="text-[13px] font-normal leading-5 text-[#202223]">
                Add a title and description to see how this product might appear in a search engine listing
              </p>
            )}
          </CardContent>
        ) : (
          <CollapsibleContent>
            <div className="border-b border-[#e3e3e3] px-4 py-4">
              <p className="text-[13px] font-normal leading-5 text-[#202223]">
                Add a title and description to see how this product might appear in a search engine listing
              </p>
            </div>

            <CardContent className="space-y-5 p-4">
              <div className="space-y-2">
                <Label htmlFor="seo_title" className="text-[13px] font-medium text-[#202223]">
                  Page title
                </Label>
                <Input
                  id="seo_title"
                  {...seoTitleRegistration}
                  maxLength={70}
                  className="h-8 rounded-[10px] border-[#c9c9c9] bg-white text-[13px]"
                />
                <div className="text-[12px] leading-4 text-[#5f6368]">
                  {(watchSeoTitle ?? "").length} of 70 characters used
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seo_description" className="text-[13px] font-medium text-[#202223]">
                  Meta description
                </Label>
                <Textarea
                  id="seo_description"
                  {...seoDescriptionRegistration}
                  maxLength={160}
                  rows={3}
                  className="min-h-[92px] resize-y rounded-[10px] border-[#c9c9c9] bg-white text-[13px]"
                />
                <div className="text-[12px] leading-4 text-[#5f6368]">
                  {(watchSeoDescription ?? "").length} of 160 characters used
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="handle" className="text-[13px] font-medium text-[#202223]">
                  URL handle
                </Label>
                <div className="flex h-8 items-center rounded-[10px] border border-[#c9c9c9] bg-white focus-within:border-[#202223] focus-within:ring-1 focus-within:ring-[#202223]/20">
                  <span className="pl-3 text-[13px] text-[#5f6368]">products/</span>
                  <Input
                    id="handle"
                    {...handleRegistration}
                    maxLength={255}
                    className="h-[30px] min-w-0 flex-1 rounded-none border-0 bg-transparent px-1.5 text-[13px] shadow-none focus-visible:ring-0"
                    placeholder={slugify(watchName) || "short-sleeve-t-shirt"}
                  />
                </div>
                <p className="break-all text-[12px] leading-4 text-[#5f6368]">
                  https://maraapparels.maara.co.in/products/{watchHandle || slugify(watchName) || ""}
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        )}
      </Card>
    </Collapsible>
  );
}
