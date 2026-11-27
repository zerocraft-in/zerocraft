"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "@zerocraft/ui/toast";
import { useForm, useWatch } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { slugify } from "@/lib/utils";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  updateProduct,
  updateVariant,
  createVariant,
  createProductImage,
  updateProductImage,
  deleteProductImage,
} from "../actions";
import { syncProductChannelPublications } from "../publication-actions";
import { useDirtyForm } from "@/components/providers/dirty-provider";
import { useProductFormState } from "@/app/(dashboard)/products/lib/product-form-state";
import {
  productFormSchema,
  type ProductFormValues,
  parseMoney,
  normalizeWeightToGrams,
  formatMoneyInput,
} from "@/app/(dashboard)/products/lib/product-schema";
import { Paise } from "@/lib/money";
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
import { SalesSummaryCard } from "../_components/sales-summary-card";
import { FormErrorCard } from "../_components/form-error-card";
import { PageHeader } from "@/components/layout/page-header";

type ProductData = {
  id: string;
  public_id: number;
  name: string;
  description: string | null;
  category_id: string | null;
  handle: string;
  vendor: string | null;
  product_type: string | null;
  tags: string[];
  tax_rate_bps: number;
  is_tax_inclusive: boolean;
  requires_shipping: boolean;
  weight_grams: number | null;
  weight_unit: "g" | "kg" | "oz" | "lb";
  hs_code: string | null;
  country_of_origin: string | null;
  seo_title: string | null;
  seo_description: string | null;
  published_scope: "web" | "global";
  status: string;
  product_options: Array<{
    id: string;
    name: string;
    position: 1 | 2 | 3;
    values: string[];
  }>;
  product_variants: Array<{
    id: string;
    sku: string;
    barcode: string | null;
    option1: string | null;
    option2: string | null;
    option3: string | null;
    cost_price_paise: number;
    selling_price_paise: number;
    compare_at_price_paise: number | null;
    cost_per_item_paise: number;
    track_quantity: boolean;
    quantity: number;
    continue_selling_when_out_of_stock: boolean;
    weight_grams: number | null;
    weight_unit: "g" | "kg" | "oz" | "lb";
    requires_shipping: boolean;
    is_active: boolean;
  }>;
  images: Array<{
    id: string;
    product_id?: string;
    variant_ids: string[];
    src: string;
    alt: string | null;
    position: number;
    width: number | null;
    height: number | null;
  }>;
};

function variantKey(v: {
  option1: string | null;
  option2: string | null;
  option3: string | null;
}) {
  return [v.option1, v.option2, v.option3]
    .filter(Boolean)
    .map((v) => v!.trim())
    .join("|");
}

function gramsToDisplay(
  grams: number | null,
  unit: "g" | "kg" | "oz" | "lb",
): string {
  if (!grams) return "";
  switch (unit) {
    case "g":
      return String(grams);
    case "kg":
      return String(grams / 1000);
    case "oz":
      return String((grams / 28.3495).toFixed(3));
    case "lb":
      return String((grams / 453.592).toFixed(3));
    default:
      return String(grams);
  }
}

/** Convert integer paise (from DB) to a two-decimal string for form inputs. */
function toMoneyInput(paise: number | null): string {
  return formatMoneyInput((paise ?? 0) as unknown as Paise);
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const routeKey = params.id as string;
  const isUuidRoute = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(routeKey);
  const isPublicIdRoute = /^\d{13}$/.test(routeKey);
  const [resolvedProductId, setResolvedProductId] = React.useState<string | null>(
    isUuidRoute ? routeKey : null,
  );
  const productId = resolvedProductId ?? "";

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
  const suppressVariantDirty = React.useRef(false);
  const [existingImages, setExistingImages] = React.useState<Array<{
    id: string;
    src: string;
  }>>([]);
  const [loadedVariants, setLoadedVariants] = React.useState<
    ProductData["product_variants"]
  >([]);
  const [variantValue, setVariantValue] = React.useState<VariantBuilderValue>();

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

  const watchName = useWatch({ control: form.control, name: "name" });
  const watchHandle = useWatch({ control: form.control, name: "handle" });
  const watchStatus = useWatch({ control: form.control, name: "status" });
  const handleInitialized = React.useRef(false);

  React.useEffect(() => {
    if (!handleInitialized.current && watchName && !watchHandle) {
      form.setValue("handle", slugify(watchName), { shouldDirty: false });
      handleInitialized.current = true;
    }
  }, [watchName, watchHandle, form]);

  // Load product, options, variants, and images.
  React.useEffect(() => {
    let cancelled = false;

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

      const orgId = membership.organization_id;
      setOrganizationId(orgId);

      const productLookup = supabase
        .from("products")
        .select("id, public_id")
        .eq("organization_id", orgId);
      const { data: productReference, error: productReferenceError } = isUuidRoute
        ? await productLookup.eq("id", routeKey).maybeSingle()
        : isPublicIdRoute
          ? await productLookup.eq("public_id", Number(routeKey)).maybeSingle()
          : { data: null, error: null };

      if (productReferenceError) {
        console.error("Failed to resolve product route:", productReferenceError);
        form.setError("root.server", { message: "Failed to load product." });
        router.push("/products");
        setLoading(false);
        return;
      }

      if (!productReference) {
        form.setError("root.server", { message: "Product not found." });
        router.push("/products");
        setLoading(false);
        return;
      }

      const internalProductId = productReference.id;
      setResolvedProductId(internalProductId);

      // UUID links remain supported, but public_id is the canonical product URL.
      if (isUuidRoute && productReference.public_id) {
        router.replace(`/products/${productReference.public_id}`);
        return;
      }

      const [productResult, optionsResult, variantsResult, imagesResult] =
        await Promise.all([
          supabase
            .from("products")
            .select(
                "id, public_id, name, category_id, description, handle, vendor, product_type, tags, " +
                "tax_rate_bps, is_tax_inclusive, requires_shipping, weight_grams, weight_unit, " +
                "hs_code, country_of_origin, seo_title, seo_description, published_scope, status",
            )
            .eq("organization_id", orgId)
            .eq("id", internalProductId)
            .maybeSingle(),
          supabase
            .from("product_options")
            .select("id, public_id, name, position, values")
            .eq("organization_id", orgId)
            .eq("product_id", internalProductId)
            .order("position", { ascending: true }),
          supabase
            .from("variants")
            .select(
              "id, public_id, sku, barcode, option1, option2, option3, cost_price_paise, selling_price_paise:price_paise, compare_at_price_paise, cost_per_item_paise, track_quantity, quantity, continue_selling_when_out_of_stock, weight_grams:grams, weight_unit, requires_shipping, is_active",
            )
            .eq("organization_id", orgId)
            .eq("product_id", internalProductId)
            .order("sku", { ascending: true }),
          supabase
            .from("product_images")
            .select(
              "id, public_id, product_id, variant_ids, src, alt, position, width, height, created_at, updated_at",
            )
            .eq("organization_id", orgId)
            .eq("product_id", internalProductId)
            .order("position", { ascending: true }),
        ]);

      if (cancelled) return;

      if (productResult.error) {
        console.error("Failed to load product:", productResult.error);
        form.setError("root.server", { message: "Failed to load product." });
        router.push("/products");
        setLoading(false);
        return;
      }

      if (!productResult.data) {
        form.setError("root.server", { message: "Product not found." });
        router.push("/products");
        setLoading(false);
        return;
      }

      const product = productResult.data as unknown as ProductData;

      // Product-level pricing lives on variants; seed from the first variant.
      const primaryVariant = (variantsResult.data ?? [])[0];

      // Seed form scalar fields from the existing product.
      const taxPercent = product.tax_rate_bps
        ? (product.tax_rate_bps / 100).toFixed(2)
        : "";
      form.reset({
        name: product.name,
        description: product.description ?? "",
        handle: product.handle,
        vendor: product.vendor ?? "",
        product_type: product.product_type ?? "",
        tags: product.tags ?? [],
        category_id: product.category_id,
        price: toMoneyInput(primaryVariant?.selling_price_paise ?? null),
        compare_at_price: toMoneyInput(
          primaryVariant?.compare_at_price_paise ?? null,
        ),
        cost_per_item: toMoneyInput(primaryVariant?.cost_per_item_paise ?? null),
        sku: primaryVariant?.sku ?? "",
        barcode: primaryVariant?.barcode ?? "",
        track_quantity: primaryVariant?.track_quantity ?? true,
        quantity: String(primaryVariant?.quantity ?? 0),
        continue_selling_when_out_of_stock:
          primaryVariant?.continue_selling_when_out_of_stock ?? false,
        is_tax_inclusive: product.is_tax_inclusive,
        tax_rate_percent: taxPercent,
        requires_shipping: product.requires_shipping,
        weight: gramsToDisplay(product.weight_grams, product.weight_unit),
        weight_unit: product.weight_unit,
        packed_length: "",
        packed_width: "",
        packed_height: "",
        dimension_unit: "cm",
        hs_code: product.hs_code ?? "",
        country_of_origin: product.country_of_origin ?? "",
        seo_title: product.seo_title ?? "",
        seo_description: product.seo_description ?? "",
        published_scope: product.published_scope,
        status: product.status as "draft" | "active" | "archived",
        options: (optionsResult.data ?? []).map((o) => ({
          name: o.name,
          values: o.values,
        })),
      });

      setLoadedVariants(variantsResult.data ?? []);
      setVariantValue({
        options: (optionsResult.data ?? []).map((o, position) => ({
          name: o.name,
          position,
          values: o.values.map((value: string, valuePosition: number) => ({
            value,
            position: valuePosition,
          })),
        })),
        variants: (variantsResult.data ?? []).map((v, position) => ({
          position,
          title: [v.option1, v.option2, v.option3].filter(Boolean).join(" / "),
          option1: v.option1,
          option2: v.option2,
          option3: v.option3,
          price: toMoneyInput(v.selling_price_paise),
          compare_at_price: toMoneyInput(v.compare_at_price_paise) || null,
          sku: v.sku,
          barcode: v.barcode,
          quantity: String(v.quantity ?? 0),
        })),
        isValid: true,
      });
      // Exposes the base variant's SKU/barcode controls directly for
      // products without options; there is no variant matrix to expand.
      setInventoryOpen((optionsResult.data ?? []).length === 0);
      window.setTimeout(() => { variantHydrating.current = false; }, 0);
      setExistingImages(
        (imagesResult.data ?? []).map((img) => ({ id: img.id, src: img.src })),
      );

      // Seed selected media from existing images.
      setSelectedMedia(
        (imagesResult.data ?? []).map((img) => ({
          id: img.id,
          key: img.id,
          name: img.alt ?? img.src.split("/").pop() ?? "Image",
          url: img.src,
          contentType: null,
          size: 0,
          organizationId: orgId,
        })),
      );

      setLoading(false);
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [routeKey, isUuidRoute, isPublicIdRoute, router, form, setSelectedMedia, setInventoryOpen]);

  const onSubmit = React.useCallback(async (values: ProductFormValues) => {
    if (!organizationId) return;

    form.clearErrors();
    setIsSubmitting(true);

    // Cross-field validation: compare-at price vs price.
    if (
      values.compare_at_price &&
      values.price &&
      Number(values.compare_at_price) < Number(values.price)
    ) {
      form.setError("compare_at_price", {
        message: "Compare-at price cannot be lower than price.",
      });
      setIsSubmitting(false);
      return;
    }

    if (variantValue?.options.length && !variantValue.isValid) {
      form.setError("root.variants", {
        message: "Please fix the variant errors before saving.",
      });
      setIsSubmitting(false);
      return;
    }

    const hasOptions = Boolean(variantValue?.options.length);
    const variants = hasOptions
      ? variantValue?.variants ?? []
      : [
          {
            ...(variantValue?.variants[0] ?? {
              position: 0,
              option1: null,
              option2: null,
              option3: null,
              title: values.name,
            }),
            title: values.name,
            option1: null,
            option2: null,
            option3: null,
            price: values.price,
            compare_at_price: values.compare_at_price || null,
            sku: values.sku,
            barcode: values.barcode || null,
            quantity: values.quantity || "0",
          },
        ];

    const weightGrams = normalizeWeightToGrams(
      values.weight ?? null,
      values.weight_unit,
    );

    const payload = {
      id: productId,
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
    };

    try {
      const productResult = await updateProduct(payload);

      if (!productResult.ok) {
        form.setError("root.server", { message: productResult.error });
        return;
      }

      // Upsert variants: update existing, create new.
      const trackQty = values.track_quantity;
      for (const variant of variants) {
        const sellingPrice = parseMoney(variant.price);
        const cost = parseMoney(values.cost_per_item);
        const compareAt = variant.compare_at_price
          ? parseMoney(variant.compare_at_price)
          : null;
        const weightGrams = normalizeWeightToGrams(values.weight ?? null, values.weight_unit);

        const baseVariantInput = {
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
        };

        const optionKey = [variant.option1, variant.option2, variant.option3]
          .filter(Boolean)
          .map((value) => value!.trim())
          .join("|");
        // Older variants may not have option columns populated even though
        // their product options are present. Prefer the option key, then use
        // the stable SKU identity, and finally preserve the single base
        // variant for products without options.
        const existing = loadedVariants.find((loaded) =>
          variantKey(loaded) === optionKey ||
          (variant.sku && loaded.sku === variant.sku) ||
          (!optionKey && !variantValue?.options.length && loadedVariants.length === 1),
        );
        if (existing) {
          const result = await updateVariant({
            id: existing.id,
            ...baseVariantInput,
          });
          if (!result.ok) {
            form.setError("root.server", { message: result.error });
            return;
          }
        } else {
          const result = await createVariant({
            product_id: productId,
            ...baseVariantInput,
          });
          if (!result.ok) {
            form.setError("root.server", { message: result.error });
            return;
          }
        }
      }

      // Sync media: create new, update existing, delete removed.
      const existingBySrc = new Map(
        existingImages.map((img) => [img.src, img]),
      );

      for (const [index, media] of selectedMedia.entries()) {
        if (existingBySrc.has(media.url)) {
          const img = existingBySrc.get(media.url)!;
          await updateProductImage({
            id: img.id,
            alt: media.name,
            position: index + 1,
          });
        } else {
          await createProductImage({
            product_id: productId,
            variant_ids: [],
            src: media.url,
            alt: media.name,
            position: index + 1,
          });
        }
      }

      // Remove images no longer selected.
      const selectedSrcs = new Set(selectedMedia.map((m) => m.url));
      for (const img of existingImages) {
        if (!selectedSrcs.has(img.src) && img.id) {
          await deleteProductImage({ id: img.id });
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

      // Reset the dirty baseline before routing back to the saved product.
      setPublishingDirty(false);
      // VariantEditor can emit its controlled value once more while the
      // saved baseline is being reset. Ignore that reconciliation event.
      suppressVariantDirty.current = true;
      variantHydrating.current = true;
      setVariantDirty(false);
      form.reset(form.getValues());
      window.setTimeout(() => {
        variantHydrating.current = false;
        suppressVariantDirty.current = false;
      }, 1000);
      toast.add({ title: "changes saved.", type: "success" });
    } catch {
      form.setError("root.server", {
        message: "Something went wrong while saving this product. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [organizationId, variantValue, existingImages, form, loadedVariants, productId, publishingKeys, selectedMedia]);

  const handleFormSubmit = React.useCallback(async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    const isValid = await form.trigger();
    if (!isValid) return;
    await onSubmit(form.getValues());
  }, [onSubmit, form]);

  useDirtyForm({
    dirty: form.formState.isDirty || publishingDirty || variantDirty,
    saving: isSubmitting,
    label: "Unsaved changes",
    onDiscard: () => {
      form.reset();
      clearSelectedMedia();
      router.push(`/products/${productId}`);
    },
    onSave: () => {
      void handleFormSubmit();
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
      <div className="product-edit-page relative min-h-full bg-white text-[#202223]">
      <div className="relative mx-auto flex max-w-[1088px] flex-col overflow-visible px-4 py-4 sm:px-0 lg:py-6">
        <div className="mb-6 flex items-center gap-2">
          <h1 className="flex items-center gap-2 text-[22px] font-semibold leading-7 tracking-[-0.02em] text-[#202223]">
            {watchName || "Edit product"}
            {watchStatus && (
              <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${watchStatus === "active" ? "bg-[#d9f7c9] text-[#1f6b2c]" : watchStatus === "draft" ? "bg-[#dff3ff] text-[#155b7a]" : "bg-[#f1f1f1] text-[#5f6368]"}`}>
                {watchStatus === "draft" ? "Draft" : watchStatus === "archived" ? "Unlisted" : "Active"}
              </span>
            )}
          </h1>
        </div>
        <FormErrorCard errors={form.formState.errors} />
        <form
          id="product-form"
          onSubmit={handleFormSubmit}
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
            <VariantsSection
              value={variantValue}
              resetKey={variantValue ? "loaded" : "empty"}
              hideSingleVariantTable={variantValue?.options.length === 0}
              onChange={(next) => {
                setVariantValue(next);
                if (!variantHydrating.current && !suppressVariantDirty.current) {
                  setVariantDirty(true);
                }
              }}
            />
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
            <PublishingCard productId={productId} onSelectionChange={setPublishingKeys} onDirtyChange={setPublishingDirty} />
            <SalesSummaryCard />
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
