"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "@zerocraft/ui/toast";
import { slugify } from "@/lib/utils";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { createProduct, createVariant, createProductImage } from "../actions";
import { syncProductChannelPublications } from "../publication-actions";
import { useDirtyForm } from "@/components/providers/dirty-provider";
import { useProductFormState } from "@/app/(dashboard)/products/lib/product-form-state";
import {
  productFormSchema,
  type ProductFormValues,
  parseMoney,
  normalizeWeightToGrams,
  computeProfitMargin,
} from "@/app/(dashboard)/products/lib/product-schema";
import type { VariantBuilderValue } from "@/app/(dashboard)/products/lib/variant-builder";
import { MediaPicker } from "@/components/media-picker/media-picker";
import { PricingSection } from "../_components/pricing-section";
import { ProductIdentityCard } from "../_components/product-identity-card";
import { InventoryCard } from "../_components/inventory-card";
import { ShippingCard } from "../_components/shipping-card";
import { VariantsSection } from "../_components/variants-section";
import { MetafieldsCard } from "../_components/metafields-card";
import { SeoSection } from "../_components/seo-section";
import { StatusCard } from "../_components/status-card";
import { PublishingCard } from "../_components/publishing-card";
import { OrganizationCard } from "../_components/organization-card";
import { FormErrorCard } from "../_components/form-error-card";
import { PageHeader } from "@/components/layout/page-header";

export default function NewProductPage() {
  const router = useRouter();

  const [organizationId, setOrganizationId] = React.useState<string | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);
  const [mediaPickerOpen, setMediaPickerOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [publishingKeys, setPublishingKeys] = React.useState<string[]>([]);
  const [publishingDirty, setPublishingDirty] = React.useState(false);
  const [variantDirty, setVariantDirty] = React.useState(false);
  const variantHydrating = React.useRef(true);

  React.useEffect(() => {
    variantHydrating.current = false;
  }, []);

  // Shared form state (options, variants, media, section flags).
  const {
    selectedMedia,
    setSelectedMedia,
    clearSelectedMedia,
    inventoryOpen,
    setInventoryOpen,
    shippingOpen,
    setShippingOpen,
    seoOpen,
    setSeoOpen,
  } = useProductFormState();
  const [variantValue, setVariantValue] = React.useState<VariantBuilderValue>();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema) as Resolver<
      ProductFormValues,
      unknown,
      ProductFormValues
    >,
    defaultValues: {
      name: "",
      description: "",
      handle: "",
      vendor: "",
      product_type: "",
      tags: [],
      category_id: null,
      price: "",
      compare_at_price: "",
      cost_per_item: "",
      is_tax_inclusive: false,
      tax_rate_percent: "",
      unit_price_total_amount: "",
      unit_price_total_amount_unit: "g",
      unit_price_base_measure: "1",
      unit_price_base_measure_unit: "g",
      track_quantity: true,
      quantity: "0",
      continue_selling_when_out_of_stock: false,
      sku: "",
      barcode: "",
      requires_shipping: true,
      weight: "",
      weight_unit: "g",
      packed_length: "",
      packed_width: "",
      packed_height: "",
      dimension_unit: "cm",
      hs_code: "",
      country_of_origin: "",
      seo_title: "",
      seo_description: "",
      published_scope: "web",
      status: "active",
      options: [],
    },
  });

  React.useEffect(() => {
    async function loadData() {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (!membership) {
        router.push("/onboarding");
        return;
      }

      setOrganizationId(membership.organization_id);

      setLoading(false);
    }

    loadData();
  }, [router]);

  const onSubmit = async (values: ProductFormValues) => {
    if (!organizationId) return;

    form.clearErrors();
    setIsSubmitting(true);

    // Cross-field validation: compare-at price vs price.
    const priceRelationshipErrors = {
      ...(values.compare_at_price &&
      values.price &&
      Number(values.compare_at_price) < Number(values.price)
        ? { compare_at_price: "Compare-at price cannot be lower than price." }
        : {}),
    };

    if (Object.keys(priceRelationshipErrors).length > 0) {
      form.setError("compare_at_price", {
        message: priceRelationshipErrors.compare_at_price!,
      });
      setIsSubmitting(false);
      return;
    }

    const editorVariants = variantValue?.variants ?? [];
    if (variantValue?.options.length && !variantValue.isValid) {
      form.setError("root.variants", {
        message: "Please fix the variant errors before saving.",
      });
      setIsSubmitting(false);
      return;
    }

    const variants = editorVariants.length
      ? editorVariants
      : [{
          position: 0,
          title: values.name,
          option1: null,
          option2: null,
          option3: null,
          price: values.price,
          compare_at_price: values.compare_at_price || null,
          sku: values.sku,
          barcode: values.barcode || null,
          quantity: values.quantity || "0",
        }];

    // Shopify treats SKU as optional in the product editor, while our
    // database keeps it as a unique internal variant key. Generate a stable
    // fallback only at persistence time so the UI can remain SKU-optional.
    const skuBase = (slugify(values.handle || values.name) || "PRODUCT")
      .replace(/[^a-z0-9-]/gi, "")
      .toUpperCase()
      .slice(0, 32) || "PRODUCT";
    const variantsWithSkus = variants.map((variant, index) => ({
      ...variant,
      sku: variant.sku?.trim() || `${skuBase}-${index + 1}`.slice(0, 40),
    }));

    const pricePaise = parseMoney(values.price);
    const costPaise = parseMoney(values.cost_per_item);
    const { profit, margin } = computeProfitMargin(pricePaise, costPaise);

    const weightGrams = normalizeWeightToGrams(
      values.weight ?? null,
      values.weight_unit,
    );

    const payload = {
      name: values.name,
      description: values.description || null,
      handle: values.handle || slugify(values.name),
      vendor: values.vendor || null,
      product_type: values.product_type || null,
      tags: values.tags,
      category_id: values.category_id,
      tax_rate_bps: values.tax_rate_percent
        ? Math.round(Number(values.tax_rate_percent) * 100)
        : 0,
      is_tax_inclusive: values.is_tax_inclusive,
      requires_shipping: values.requires_shipping,
      weight_grams: weightGrams,
      weight_unit: values.weight_unit,
      hs_code: values.hs_code || null,
      country_of_origin: values.country_of_origin || null,
      seo_title: values.seo_title || null,
      seo_description: values.seo_description || null,
      published_scope: values.published_scope,
      status: values.status,
      options: (variantValue?.options ?? values.options).filter(
        (o) => o.name && o.values.some((v) => typeof v === "string" ? v : v.value),
      ).map((o) => ({
        name: o.name,
        values: o.values.map((v) => typeof v === "string" ? v : v.value),
      })),
      // Variant-level data
      profit_paise: profit ?? null,
      margin_percent: margin ?? null,
      images: selectedMedia.map((m, i) => ({
        src: m.url,
        alt: m.name,
        position: i + 1,
      })),
    };

    try {
      const result = await createProduct(payload);

      if (!result.ok) {
        form.setError("root.server", { message: result.error });
        return;
      }

      const productId = result.id as string;

      // Persist variants atomically after the base product exists.
      const trackQty = values.track_quantity;
      for (const variant of variantsWithSkus) {
        const sellingPrice = parseMoney(variant.price);
        const cost = costPaise;
        const compareAt = variant.compare_at_price
          ? parseMoney(variant.compare_at_price)
          : null;
        const variantResult = await createVariant({
          product_id: productId,
          sku: variant.sku,
          barcode: variant.barcode ?? undefined,
          option1: variant.option1 ?? undefined,
          option2: variant.option2 ?? undefined,
          option3: variant.option3 ?? undefined,
          cost_price_paise: cost ?? 0,
          selling_price_paise: sellingPrice ?? 0,
          compare_at_price_paise: compareAt ?? null,
          cost_per_item_paise: cost ?? 0,
          tax_rate_bps: values.tax_rate_percent
            ? Math.round(Number(values.tax_rate_percent) * 100)
            : 0,
          track_quantity: trackQty,
          quantity: Number(variant.quantity) || 0,
          continue_selling_when_out_of_stock: values.continue_selling_when_out_of_stock,
          weight_grams: weightGrams,
          weight_unit: values.weight_unit,
          requires_shipping: values.requires_shipping,
          reorder_point: 0,
        });

        if (!variantResult.ok) {
          form.setError("root.server", { message: variantResult.error });
          return;
        }
      }

      // Persist media.
      for (const [index, media] of selectedMedia.entries()) {
        const imageResult = await createProductImage({
          product_id: productId,
          variant_ids: [],
          src: media.url,
          alt: media.name,
          position: index + 1,
        });
        if (!imageResult.ok) {
          form.setError("root.server", { message: imageResult.error });
          return;
        }
      }

      const publicationResult = await syncProductChannelPublications({
        productId,
        channelKeys: publishingKeys,
      });
      if (!publicationResult.ok) {
        form.setError("root.server", { message: publicationResult.error });
        return;
      }

      // Mark the current values as the saved baseline before navigating so
      // the dirty bar closes immediately instead of surviving the transition.
      setPublishingDirty(false);
      setVariantDirty(false);
      form.reset(form.getValues());
      toast.add({ title: "Product created.", type: "success" });
      router.push("/products");
    } catch {
      form.setError("root.server", {
        message: "Something went wrong while saving this product. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useDirtyForm({
    dirty: form.formState.isDirty || publishingDirty || variantDirty,
    saving: isSubmitting,
    label: "Unsaved product",
    onDiscard: () => {
      form.reset();
      clearSelectedMedia();
      router.push("/products");
    },
    onSave: () => {
      void form.handleSubmit(onSubmit, () => {
      })();
    },
  });

  if (loading || !organizationId) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col px-5 py-6 sm:px-8 sm:py-10">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
        </div>
      </div>
    );
  }

  const hasVariantOptions = (variantValue?.options.length ?? 0) > 0;

  return (
    <PageHeader>
      <div className="product-create-page relative min-h-full bg-white text-[#202223]">
      <div className="relative mx-auto flex max-w-[1088px] flex-col overflow-visible px-4 py-4 sm:px-0 lg:py-6">
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold leading-7 tracking-[-0.02em] text-[#202223]">
            Add product
          </h1>
        </div>
        <FormErrorCard errors={form.formState.errors} />
        <form
          id="product-form"
          onSubmit={form.handleSubmit(onSubmit, () => {
          })}
          className="grid gap-8 xl:grid-cols-[minmax(0,760px)_280px] xl:gap-12"
        >
          {/* Left column - main form */}
          <div className="space-y-8">
            <ProductIdentityCard
              form={form}
              organizationId={organizationId}
              selectedMedia={selectedMedia}
              setMediaPickerOpen={setMediaPickerOpen}
            />
            {!hasVariantOptions && <PricingSection form={form} />}
            {!hasVariantOptions && (
              <InventoryCard
                form={form}
                inventoryOpen={inventoryOpen}
                setInventoryOpen={setInventoryOpen}
              />
            )}
            {!hasVariantOptions && (
              <ShippingCard
                form={form}
                shippingOpen={shippingOpen}
                setShippingOpen={setShippingOpen}
              />
            )}
            <VariantsSection value={variantValue} onChange={(next) => { setVariantValue(next); if (!variantHydrating.current) setVariantDirty(true); }} />
            <MetafieldsCard />
            <SeoSection
              form={form}
              seoOpen={seoOpen}
              setSeoOpen={setSeoOpen}
            />
          </div>

          {/* Right column - side panel */}
          <div className="space-y-5 xl:sticky xl:top-6">
            <StatusCard form={form} />
            <PublishingCard onSelectionChange={setPublishingKeys} onDirtyChange={setPublishingDirty} />
            <OrganizationCard form={form} />
          </div>
        </form>

        <MediaPicker
          open={mediaPickerOpen}
          onOpenChange={setMediaPickerOpen}
          multiple
          maxSelection={10}
          acceptedTypes={["image", "video", "other"]}
          selectedMedia={selectedMedia}
          onConfirm={(media) => {
            setSelectedMedia(media);
            form.setValue("description", form.getValues("description"), {
              shouldDirty: true,
            });
          }}
          folder="products"
        />
      </div>
      </div>
    </PageHeader>
  );
}
