"use client";

import {
  useEffect,
  useMemo,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  IconArrowLeft,
  IconBox,
  IconChevronDown,
  IconDeviceFloppy,
  IconFile,
  IconDownload,
  IconGripVertical,
  IconPhoto,
  IconPlus,
  IconTrash,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import { Alert, AlertDescription, AlertTitle } from "@zerocraft/components/ui/alert";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@zerocraft/components/ui/attachment";
import { Badge } from "@zerocraft/components/ui/badge";
import { Button } from "@zerocraft/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@zerocraft/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@zerocraft/components/ui/field";
import { Input } from "@zerocraft/components/ui/input";
import { Textarea } from "@zerocraft/components/ui/textarea";
import { PageState } from "@/components/commerce/page-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@zerocraft/components/ui/select";

type ProductMedia = {
  id?: string;
  storage_path?: string;
  public_url: string;
  name?: string;
  size?: number;
  mimeType?: string;
  alt_text?: string;
  sort_order?: number;
  media_type?: string;
  is_primary?: boolean;
};
type MediaAsset = {
  path: string;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
};
type LocalMedia = { file: File; preview: string; name: string };
type DigitalFile = {
  id?: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  variant_id?: string | null;
  sort_order?: number;
};
type LocalDigitalFile = { file: File; variantId: string };
type ProductOption = { name: string; values: string };

type Variant = {
  id?: string;
  label: string;
  sku: string;
  options: Record<string, string>;
  price: number;
  stock: number | null;
  is_active: boolean;
  inventory?: { location_id: string; on_hand: number; reorder_point: number }[];
  inventory_levels?: {
    location_id: string;
    on_hand: number;
    reserved: number;
    reorder_point: number;
  }[];
};

type InventoryLocation = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

type ProductDraft = {
  id?: string;
  write_version?: number;
  title: string;
  slug: string;
  description: string;
  category_id: string | null;
  subcategory_id: string | null;
  design_origin: "original_zerocraft" | "licensed" | "fan_inspired";
  rights_status: "not_applicable" | "approved_license" | "review_required";
  product_type: "physical" | "digital";
  status: "draft" | "active" | "archived";
  sku: string;
  price: number;
  compare_at_price: number | null;
  currency: string;
  stock: number | null;
  image_url: string;
  media: ProductMedia[];
  digital_files: DigitalFile[];
  digital_delivery: {
    mode: "instant" | "manual";
    download_limit: number;
    link_expiry_hours: number;
  };
  variants: Variant[];
  deleted_at?: string | null;
  purge_after?: string | null;
};

type Category = {
  id: string;
  name: string;
  subcategories?: { id: string; name: string }[];
};

type StorePayload = {
  configured: boolean;
  catalogError: string | null;
  categories: Category[];
  inventoryLocations?: InventoryLocation[];
  products: Array<
    ProductDraft & {
      id: string;
      variants?: Variant[];
      product_media?: ProductMedia[];
      digital_files?: DigitalFile[];
    }
  >;
};

type ProductStep = "basics" | "options" | "variants";
const productSteps: Array<{
  id: ProductStep;
  label: string;
  description: string;
}> = [
  {
    id: "basics",
    label: "Basics",
    description: "Title, description and media",
  },
  { id: "options", label: "Options", description: "Type, category and rights" },
  {
    id: "variants",
    label: "Variants & pricing",
    description: "SKU, price and inventory",
  },
];

const emptyProduct: ProductDraft = {
  title: "",
  slug: "",
  description: "",
  category_id: null,
  subcategory_id: null,
  design_origin: "original_zerocraft",
  rights_status: "not_applicable",
  product_type: "physical",
  status: "draft",
  sku: "",
  price: 0,
  compare_at_price: null,
  currency: "INR",
  stock: 0,
  image_url: "",
  media: [],
  digital_files: [],
  digital_delivery: {
    mode: "instant",
    download_limit: 0,
    link_expiry_hours: 0,
  },
  variants: [],
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const skuFromTitle = (value: string) => {
  const base = value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 18);
  return base ? `ZC-${base}` : "";
};

const formatBytes = (value: number) =>
  value < 1024 * 1024
    ? `${Math.max(1, Math.round(value / 1024))} KB`
    : `${(value / (1024 * 1024)).toFixed(1)} MB`;

const fieldClass = "grid gap-2 text-[15px] font-medium";
const cardClass = "border-b border-border bg-transparent shadow-none";

function ProductSelect({
  value,
  onValueChange,
  placeholder,
  options,
  disabled,
  className = "w-full h-9 rounded-xl!",
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => next && onValueChange(next)}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ProductEditor({
  mode,
  productId,
}: {
  mode: "create" | "edit";
  productId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedStep = searchParams.get("step") as ProductStep | null;
  const step: ProductStep = productSteps.some(
    (item) => item.id === requestedStep,
  )
    ? (requestedStep as ProductStep)
    : "basics";
  const stepIndex = productSteps.findIndex((item) => item.id === step);
  const [product, setProduct] = useState<ProductDraft>(emptyProduct);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventoryLocations, setInventoryLocations] = useState<
    InventoryLocation[]
  >([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [basicsAttempted, setBasicsAttempted] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<LocalMedia[]>([]);
  const [digitalUploads, setDigitalUploads] = useState<LocalDigitalFile[]>([]);
  const [digitalError, setDigitalError] = useState("");
  const [mediaError, setMediaError] = useState("");
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [mediaLibrary, setMediaLibrary] = useState<MediaAsset[]>([]);
  const [mediaLibraryQuery, setMediaLibraryQuery] = useState("");
  const [mediaLibraryLoading, setMediaLibraryLoading] = useState(false);
  const [draggedMedia, setDraggedMedia] = useState<{
    kind: "library" | "local";
    index: number;
  } | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<{
    kind: "library" | "local";
    index: number;
  } | null>(null);
  const [optionGroups, setOptionGroups] = useState<ProductOption[]>([
    { name: "", values: "" },
  ]);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [skuTouched, setSkuTouched] = useState(mode === "edit");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/store", {
          cache: "no-store",
        });
        const result = (await response.json()) as StorePayload & {
          error?: string;
        };
        if (!response.ok)
          throw new Error(result.error || "Products could not be loaded.");
        if (!active) return;
        setCategories(result.categories || []);
        setInventoryLocations(result.inventoryLocations || []);
        if (mode === "edit") {
          const current = result.products.find((item) => item.id === productId);
          if (!current) throw new Error("Product not found or permanently removed.");
          if (current.deleted_at) throw new Error("This product is in Recently deleted. Restore it before editing.");
          setProduct({
            ...current,
            currency: "INR",
            media: current.product_media || current.media || [],
            digital_files:
              current.digital_files ||
              current.digital_files ||
              [],
            digital_delivery:
              current.digital_delivery || emptyProduct.digital_delivery,
            variants: current.variants || current.variants || [],
          });
          const existingVariants =
            current.variants || current.variants || [];
          const optionNames = Array.from(
            new Set(
              existingVariants.flatMap((variant) =>
                Object.keys(variant.options || {}),
              ),
            ),
          );
          if (optionNames.length)
            setOptionGroups(
              optionNames.map((name) => ({
                name,
                values: Array.from(
                  new Set(
                    existingVariants
                      .map((variant) => variant.options?.[name])
                      .filter(
                        (value): value is string => typeof value === "string",
                      ),
                  ),
                ).join(", "),
              })),
            );
        }
      } catch (cause) {
        if (active)
          setLoadError(
            cause instanceof Error
              ? cause.message
              : "Product could not be loaded.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [mode, productId]);

  const subcategories = useMemo(
    () =>
      categories.find((item) => item.id === product.category_id)
        ?.subcategories || [],
    [categories, product.category_id],
  );

  function update<K extends keyof ProductDraft>(
    key: K,
    value: ProductDraft[K],
  ) {
    setProduct((current) => ({ ...current, [key]: value }));
  }

  function updateTitle(title: string) {
    setProduct((current) => ({
      ...current,
      title,
      slug: slugTouched ? current.slug : slugify(title),
      sku: skuTouched ? current.sku : skuFromTitle(title),
    }));
  }

  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    const available = 6 - product.media.length - mediaFiles.length;
    if (available <= 0) {
      setMediaError("You can add up to 6 product images.");
      return;
    }
    const candidates = files.slice(0, available);
    const accepted = candidates.filter(
      (file) =>
        ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
        file.size <= 10 * 1024 * 1024,
    );
    setMediaError(
      accepted.length !== candidates.length || files.length > available
        ? "Use JPEG, PNG, or WebP images up to 10 MB each, with a maximum of 6 images."
        : "",
    );
    setMediaFiles((current) => [
      ...current,
      ...accepted.map((file) => ({
        file,
        name: file.name,
        preview: URL.createObjectURL(file),
      })),
    ]);
  }

  function removeLocalMedia(index: number) {
    setMediaFiles((current) => {
      const removed = current[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return current.filter((_, row) => row !== index);
    });
  }

  function removeLibraryMedia(index: number) {
    setProduct((current) => ({
      ...current,
      media: current.media
        .filter((_, row) => row !== index)
        .map((item, row) => ({
          ...item,
          sort_order: row,
          is_primary: row === 0,
        })),
    }));
  }

  function reorderMedia(kind: "library" | "local", from: number, to: number) {
    if (from === to) return;
    if (kind === "library")
      setProduct((current) => {
        const media = [...current.media];
        const [moved] = media.splice(from, 1);
        media.splice(to, 0, moved);
        return {
          ...current,
          media: media.map((item, index) => ({
            ...item,
            sort_order: index,
            is_primary: index === 0,
          })),
        };
      });
    else
      setMediaFiles((current) => {
        const files = [...current];
        const [moved] = files.splice(from, 1);
        files.splice(to, 0, moved);
        return files;
      });
  }

  function replaceLocalFile(index: number, file?: File) {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      setMediaError("Use a JPEG, PNG, or WebP image up to 10 MB.");
      return;
    }
    setMediaFiles((current) => {
      const next = [...current];
      const previous = next[index];
      if (previous) URL.revokeObjectURL(previous.preview);
      next[index] = {
        file,
        name: file.name,
        preview: URL.createObjectURL(file),
      };
      return next;
    });
    setReplaceTarget(null);
    setMediaError("");
  }

  function handleMediaDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  }

  function addDigitalFiles(fileList: FileList | File[]) {
    const acceptedTypes = [
      "application/pdf",
      "application/zip",
      "application/x-zip-compressed",
      "application/octet-stream",
      "audio/mpeg",
      "video/mp4",
      "text/plain",
    ];
    const candidates = Array.from(fileList);
    const available = Math.max(
      0,
      10 - product.digital_files.length - digitalUploads.length,
    );
    const accepted = candidates
      .slice(0, available)
      .filter(
        (file) =>
          acceptedTypes.includes(file.type) &&
          file.size > 0 &&
          file.size <= 250 * 1024 * 1024,
      );
    setDigitalUploads((current) => [
      ...current,
      ...accepted.map((file) => ({ file, variantId: "" })),
    ]);
    setDigitalError(
      accepted.length !== candidates.length || candidates.length > available
        ? "Add up to 10 files. Use PDF, ZIP, MP3, MP4, TXT, or binary files up to 250 MB each."
        : "",
    );
  }

  function removeDigitalUpload(index: number) {
    setDigitalUploads((current) => current.filter((_, row) => row !== index));
  }

  async function updateDigitalVariant(file: DigitalFile, variantId: string) {
    if (!file.id || !product.id) return;
    const response = await fetch("/api/store/digital-files", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        fileId: file.id,
        variantId: variantId || null,
      }),
    });
    if (!response.ok) {
      setDigitalError("The file variant mapping could not be saved.");
      return;
    }
    setProduct((current) => ({
      ...current,
      digital_files: current.digital_files.map((item) =>
        item.id === file.id ? { ...item, variant_id: variantId || null } : item,
      ),
    }));
  }

  async function removeDigitalFile(file: DigitalFile) {
    if (!file.id || !product.id) return;
    const response = await fetch("/api/store/digital-files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, fileId: file.id }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setDigitalError(result.error || "Digital file could not be removed.");
      return;
    }
    setProduct((current) => ({
      ...current,
      digital_files: current.digital_files.filter(
        (item) => item.id !== file.id,
      ),
    }));
  }

  async function openMediaLibrary() {
    setMediaLibraryOpen(true);
    if (mediaLibrary.length || mediaLibraryLoading) return;
    setMediaLibraryLoading(true);
    try {
      const response = await fetch("/api/store/media-library", {
        cache: "no-store",
      });
      const result = (await response.json()) as {
        assets?: MediaAsset[];
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error || "Media library could not be loaded.");
      setMediaLibrary(result.assets || []);
    } catch (cause) {
      setMediaError(
        cause instanceof Error
          ? cause.message
          : "Media library could not be loaded.",
      );
    } finally {
      setMediaLibraryLoading(false);
    }
  }

  function selectLibraryAsset(asset: MediaAsset) {
    if (replaceTarget) {
      if (replaceTarget.kind === "library")
        setProduct((current) => ({
          ...current,
          media: current.media.map((item, index) =>
            index === replaceTarget.index
              ? {
                  ...item,
                  public_url: asset.url,
                  storage_path: asset.path,
                  name: asset.name,
                  size: asset.size,
                  mimeType: asset.mimeType,
                  alt_text: asset.name,
                }
              : item,
          ),
        }));
      else {
        removeLocalMedia(replaceTarget.index);
        setProduct((current) => ({
          ...current,
          media: [
            ...current.media,
            {
              public_url: asset.url,
              storage_path: asset.path,
              name: asset.name,
              size: asset.size,
              mimeType: asset.mimeType,
              alt_text: asset.name,
              media_type: "image",
              is_primary: current.media.length === 0,
            },
          ],
        }));
      }
      setReplaceTarget(null);
      setMediaLibraryOpen(false);
      setMediaError("");
      return;
    }
    if (
      product.media.some((item) => item.public_url === asset.url) ||
      product.media.length + mediaFiles.length >= 6
    ) {
      setMediaError("You can add up to 6 product images.");
      return;
    }
    setProduct((current) => ({
      ...current,
      media: [
        ...current.media,
        {
          public_url: asset.url,
          storage_path: asset.path,
          name: asset.name,
          size: asset.size,
          mimeType: asset.mimeType,
          alt_text: asset.name,
          media_type: "image",
          is_primary: current.media.length === 0,
        },
      ],
    }));
    setMediaError("");
  }

  function generateVariants() {
    const groups = optionGroups
      .map((group) => ({
        name: group.name.trim(),
        values: group.values
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      }))
      .filter((group) => group.name && group.values.length);
    if (!groups.length) {
      setError(
        "Add at least one option with comma-separated values before generating variants.",
      );
      return;
    }
    const combinations = groups.reduce<Record<string, string>[]>(
      (result, group) =>
        result.flatMap((current) =>
          group.values.map((value) => ({ ...current, [group.name]: value })),
        ),
      [{}],
    );
    if (combinations.length > 60) {
      setError("A product can have a maximum of 60 variants.");
      return;
    }
    const location = inventoryLocations.find((item) => item.is_active);
    setProduct((current) => ({
      ...current,
      variants: combinations.map((options) => {
        const label = Object.values(options).join(" / ");
        const existing = current.variants.find(
          (variant) => variant.label === label,
        );
        return (
          existing || {
            label,
            sku: `${current.sku || "ZC-PRODUCT"}-${slugify(label).toUpperCase().slice(0, 18)}`,
            options,
            price: current.price,
            stock: current.product_type === "physical" ? 0 : null,
            is_active: true,
            inventory:
              current.product_type === "physical" && location
                ? [{ location_id: location.id, on_hand: 0, reorder_point: 0 }]
                : [],
          }
        );
      }),
    }));
    setError("");
  }

  function updateVariant(index: number, changes: Partial<Variant>) {
    setProduct((current) => ({
      ...current,
      variants: current.variants.map((variant, row) =>
        row === index ? { ...variant, ...changes } : variant,
      ),
    }));
  }

  function addVariant() {
    setProduct((current) => {
      const location = inventoryLocations.find((item) => item.is_active);
      return {
        ...current,
        variants: [
          ...current.variants,
          {
            label: "",
            sku: `${current.sku || "ZC-PRODUCT"}-${current.variants.length + 1}`,
            options: {},
            price: current.price,
            stock: current.product_type === "physical" ? 0 : null,
            is_active: true,
            inventory:
              current.product_type === "physical" && location
                ? [{ location_id: location.id, on_hand: 0, reorder_point: 0 }]
                : [],
          },
        ],
      };
    });
  }

  function goToStep(nextStep: ProductStep) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextStep === "basics") params.delete("step");
    else params.set("step", nextStep);
    router.replace(
      `${pathname}${params.toString() ? `?${params.toString()}` : ""}`,
      { scroll: false },
    );
  }

  function continueToNextStep() {
    if (step === "basics") setBasicsAttempted(true);
    if (step === "basics" && !product.title.trim()) {
      setError("Add a product title before continuing.");
      return;
    }
    setError("");
    if (stepIndex < productSteps.length - 1)
      goToStep(productSteps[stepIndex + 1].id);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/store", {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "product",
          ...(mode === "edit" ? { id: productId } : {}),
          data: {
            ...product,
            image_url: product.media[0]?.public_url || product.image_url,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Product could not be saved.");
      const savedId = mode === "edit" ? productId : result.id;
      let firstUploadedUrl = "";
      if (savedId && mediaFiles.length) {
        for (const media of mediaFiles) {
          const form = new FormData();
          form.set("productId", savedId);
          form.set("file", media.file);
          form.set("altText", product.title);
          const uploadResponse = await fetch("/api/store/media", {
            method: "POST",
            body: form,
          });
          const uploadResult = (await uploadResponse.json()) as {
            media?: ProductMedia;
            error?: string;
          };
          if (!uploadResponse.ok)
            throw new Error(
              uploadResult.error || "A product image could not be uploaded.",
            );
          if (!firstUploadedUrl)
            firstUploadedUrl = uploadResult.media?.public_url || "";
        }
        if (!product.media[0]?.public_url && firstUploadedUrl)
          await fetch("/api/store", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              entity: "product",
              id: savedId,
              data: { ...product, image_url: firstUploadedUrl },
            }),
          });
      }
      if (savedId)
        for (const [index, media] of product.media.entries())
          if (media.id) {
            const reorderResponse = await fetch("/api/store/media", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productId: savedId,
                mediaId: media.id,
                action: "reorder",
                sortOrder: index,
              }),
            });
            if (!reorderResponse.ok)
              throw new Error("The product image order could not be saved.");
          }
      if (savedId && product.media[0]?.id)
        await fetch("/api/store/media", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: savedId,
            mediaId: product.media[0].id,
            action: "primary",
          }),
        });
      if (
        savedId &&
        product.product_type === "digital" &&
        digitalUploads.length
      ) {
        for (const file of digitalUploads) {
          const form = new FormData();
          form.set("productId", savedId);
          form.set("file", file.file);
          if (file.variantId) form.set("variantId", file.variantId);
          const uploadResponse = await fetch(
            "/api/store/digital-files",
            { method: "POST", body: form },
          );
          const uploadResult = (await uploadResponse.json()) as {
            file?: DigitalFile;
            error?: string;
          };
          if (!uploadResponse.ok)
            throw new Error(
              uploadResult.error || "A digital file could not be uploaded.",
            );
        }
      }
      router.push("/store/products");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Product could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <PageState kind="loading" title="Loading product" description="Fetching catalog details, media, variants, and inventory." className="w-full max-w-xl" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <PageState kind="error" title="Product unavailable" description={loadError} action={<Button type="button" onClick={() => router.push("/store/products")}>Back to products</Button>} className="w-full max-w-xl" />
      </div>
    );
  }

  return (
    <form
      onSubmit={save}
      className="min-h-screen w-full bg-background text-foreground pb-24"
    >
      <header className="sticky top-0 z-20 mb-8 flex min-h-[72px] items-center justify-between gap-5 border-b border-border bg-background/95 px-6 backdrop-blur sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="icon-lg"
            aria-label="Back to products"
            onClick={() => router.push("/store/products")}
            className="rounded-2xl"
          >
            <IconArrowLeft size={20} />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">
                {mode === "create"
                  ? "Add product"
                  : product.title || "Edit product"}
              </h1>
              {mode === "edit" && (
                <Badge variant="secondary" className="capitalize">
                  {product.status}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-[15px] text-muted-foreground">
              {mode === "create"
                ? "Create a product for your online store."
                : "Update product details, pricing, inventory, and publishing."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/store/products")}
          >
            Discard
          </Button>
          <Button
            type={step === "variants" ? "submit" : "button"}
            onClick={step === "variants" ? undefined : continueToNextStep}
            variant="secondary"
            className=""
            disabled={
              saving ||
              (step === "variants" &&
                (!product.title || !product.slug || !product.sku))
            }
          >
            {step === "variants" ? (
              <>
                {saving
                  ? "Saving…"
                  : mode === "create"
                    ? "Save"
                    : "Save"}
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </header>

      {error && (
        <div className="mx-auto mb-5 w-full max-w-[760px] px-6 sm:px-8">
          <Alert
            variant="destructive"
            className="rounded-xl border-destructive/30 bg-destructive/10"
          >
            <AlertTitle className="text-sm">Couldn’t save product</AlertTitle>
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <nav
        aria-label="Product creation steps"
        className="mx-auto mb-4 grid w-full max-w-[760px] grid-cols-3 gap-2 px-6 sm:px-8"
      >
        {productSteps.map((item, index) => {
          const active = item.id === step;
          const complete = index < stepIndex;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => index <= stepIndex && goToStep(item.id)}
              disabled={index > stepIndex}
              className={`group rounded-xl border px-3 py-3 text-left transition ${active ? "border-secondary bg-primary/5" : complete ? "border-border bg-muted/50 hover:bg-muted" : "border-border bg-background opacity-60"}`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span
                  className={`grid size-6 place-items-center rounded-full text-xs ${active ? "bg-primary text-primary-foreground" : complete ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}
                >
                  {complete ? "✓" : index + 1}
                </span>
                {item.label}
              </span>
              <span className="mt-1 hidden text-xs text-muted-foreground sm:block">
                {item.description}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mx-auto grid w-full max-w-[760px] items-start gap-6 px-6 sm:px-8">
        <div className="grid gap-0">
          <section
            className={`${cardClass} ${step === "basics" ? "" : "hidden"} grid gap-5 p-6`}
          >
            <FieldGroup>
              <Field data-invalid={basicsAttempted && !product.title.trim()}>
                <FieldLabel htmlFor="product-title">Title</FieldLabel>
                <Input
                  id="product-title"
                  autoFocus
                  value={product.title}
                  onChange={(event) => updateTitle(event.target.value)}
                  placeholder="Short sleeve t-shirt"
                  aria-invalid={basicsAttempted && !product.title.trim()}
                />
                {basicsAttempted && !product.title.trim() && (
                  <FieldError>
                    Product title is required before continuing.
                  </FieldError>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="product-description">
                  Description
                </FieldLabel>
                <Textarea
                  id="product-description"
                  rows={7}
                  value={product.description}
                  onChange={(event) =>
                    update("description", event.target.value)
                  }
                  placeholder="Describe the product, materials, and key details…"
                />
                <FieldDescription>
                  Include materials, dimensions, and the details customers need
                  before buying.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </section>

          {product.product_type === "digital" && (
            <section className={`${cardClass} grid gap-5 p-6 lg:p-7`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold">Digital files</h2>
                  <p className="text-sm text-muted-foreground">
                    Upload the files customers receive after payment. Files stay
                    private and are delivered through a protected download flow.
                  </p>
                </div>
                <IconDownload className="size-5 text-muted-foreground" />
              </div>
              <AttachmentGroup className="grid gap-2">
                {product.digital_files.map((file) => (
                  <Attachment
                    key={file.id || file.file_name}
                    size="sm"
                    className="w-full"
                  >
                    <AttachmentMedia variant="icon">
                      <IconFile />
                    </AttachmentMedia>
                    <AttachmentContent className="grid gap-2 sm:grid-cols-[1fr_180px] sm:items-center">
                      <AttachmentTitle>{file.file_name}</AttachmentTitle>
                      <AttachmentDescription>
                        {file.mime_type || "Digital file"} ·{" "}
                        {formatBytes(file.size_bytes)}
                      </AttachmentDescription>
                      {product.variants.length > 0 && (
                        <ProductSelect
                          value={file.variant_id || "all"}
                          onValueChange={(value) =>
                            void updateDigitalVariant(
                              file,
                              value === "all" ? "" : value,
                            )
                          }
                          placeholder="Variant"
                          options={[
                            { value: "all", label: "All variants" },
                            ...product.variants
                              .filter((variant) => Boolean(variant.id))
                              .map((variant) => ({
                                value: variant.id as string,
                                label: variant.label || variant.sku,
                              })),
                          ]}
                        />
                      )}
                    </AttachmentContent>
                    <AttachmentActions>
                      <AttachmentAction
                        type="button"
                        aria-label={`Remove ${file.file_name}`}
                        onClick={() => void removeDigitalFile(file)}
                      >
                        <IconX />
                      </AttachmentAction>
                    </AttachmentActions>
                  </Attachment>
                ))}
                {digitalUploads.map((file, index) => (
                  <Attachment
                    key={`${file.file.name}-${index}`}
                    size="sm"
                    state="done"
                    className="w-full"
                  >
                    <AttachmentMedia variant="icon">
                      <IconFile />
                    </AttachmentMedia>
                    <AttachmentContent className="grid gap-2 sm:grid-cols-[1fr_180px] sm:items-center">
                      <div>
                        <AttachmentTitle>{file.file.name}</AttachmentTitle>
                        <AttachmentDescription>
                          Ready to upload · {file.file.type || "Digital file"} ·{" "}
                          {formatBytes(file.file.size)}
                        </AttachmentDescription>
                      </div>
                      {product.variants.length > 0 && (
                        <ProductSelect
                          value={file.variantId || "all"}
                          onValueChange={(value) =>
                            setDigitalUploads((current) =>
                              current.map((item, row) =>
                                row === index
                                  ? {
                                      ...item,
                                      variantId: value === "all" ? "" : value,
                                    }
                                  : item,
                              ),
                            )
                          }
                          placeholder="Variant"
                          options={[
                            { value: "all", label: "All variants" },
                            ...product.variants
                              .filter((variant) => Boolean(variant.id))
                              .map((variant) => ({
                                value: variant.id as string,
                                label: variant.label || variant.sku,
                              })),
                          ]}
                        />
                      )}
                    </AttachmentContent>
                    <AttachmentActions>
                      <AttachmentAction
                        type="button"
                        aria-label={`Remove ${file.file.name}`}
                        onClick={() => removeDigitalUpload(index)}
                      >
                        <IconX />
                      </AttachmentAction>
                    </AttachmentActions>
                  </Attachment>
                ))}
              </AttachmentGroup>
              {product.digital_files.length + digitalUploads.length < 10 && (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5 text-center">
                  <p className="text-sm font-medium">Add digital files</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    PDF, ZIP, MP3, MP4, TXT, or binary · max 250 MB each ·{" "}
                    {product.digital_files.length + digitalUploads.length}/10
                    selected
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() =>
                      document.getElementById("digital-product-files")?.click()
                    }
                  >
                    <IconUpload /> Choose files
                  </Button>
                </div>
              )}
              <input
                id="digital-product-files"
                type="file"
                multiple
                accept="application/pdf,application/zip,application/x-zip-compressed,application/octet-stream,audio/mpeg,video/mp4,text/plain"
                className="sr-only"
                onChange={(event) => {
                  if (event.target.files) addDigitalFiles(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
              {digitalError && (
                <p className="text-sm text-destructive">{digitalError}</p>
              )}
              <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
                <label className={fieldClass}>
                  Delivery
                  <ProductSelect
                    value={product.digital_delivery.mode}
                    onValueChange={(value) =>
                      update("digital_delivery", {
                        ...product.digital_delivery,
                        mode: value as "instant" | "manual",
                      })
                    }
                    placeholder="Delivery"
                    options={[
                      { value: "instant", label: "Instant download" },
                      { value: "manual", label: "Manual fulfilment" },
                    ]}
                  />
                </label>
                <label className={fieldClass}>
                  Download limit{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    0 = unlimited
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={product.digital_delivery.download_limit}
                    onChange={(event) =>
                      update("digital_delivery", {
                        ...product.digital_delivery,
                        download_limit: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label className={fieldClass}>
                  Link expiry{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    0 = never
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={product.digital_delivery.link_expiry_hours}
                    onChange={(event) =>
                      update("digital_delivery", {
                        ...product.digital_delivery,
                        link_expiry_hours: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </div>
            </section>
          )}

          <section
            className={`${cardClass} ${step === "basics" ? "" : "hidden"} p-6 lg:p-7`}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">Media</h2>
                <p className="text-sm text-muted-foreground">
                  Add up to 6 product images. Drag to reorder and choose a cover
                  image.
                </p>
              </div>
              <IconPhoto className="size-5 text-muted-foreground" />
            </div>
            <div className="mb-4 flex items-center gap-2">
              <div className="mx-auto min-h-52 max-w-md space-y-3">
                {product.media.length + mediaFiles.length > 0 ? (
                  <AttachmentGroup className="flex flex-wrap justify-center gap-3 overflow-visible">
                    {product.media.map((media, index) => (
                      <Attachment
                        key={media.id || media.public_url}
                        orientation="vertical"
                        size="sm"
                        className="!w-[120px] min-h-[164px]"
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          if (draggedMedia?.kind === "library")
                            reorderMedia("library", draggedMedia.index, index);
                          setDraggedMedia(null);
                        }}
                      >
                        <AttachmentMedia
                          variant="image"
                          className="!h-[120px] !w-full aspect-square"
                        >
                          <img
                            src={media.public_url}
                            alt={media.alt_text || `Product image ${index + 1}`}
                            className="!h-full !w-full object-cover"
                          />
                        </AttachmentMedia>
                        <AttachmentContent className="!w-full px-2 pb-2">
                          <AttachmentTitle>
                            {media.name ||
                              media.alt_text ||
                              (index === 0
                                ? "Cover image"
                                : `Image ${index + 1}`)}
                          </AttachmentTitle>
                          <AttachmentDescription>
                            {media.mimeType?.split("/")[1]?.toUpperCase() ||
                              "IMAGE"}{" "}
                            ·{" "}
                            {media.size
                              ? formatBytes(media.size)
                              : "Media library"}
                          </AttachmentDescription>
                        </AttachmentContent>
                        <AttachmentActions>
                          <AttachmentAction
                            type="button"
                            draggable
                            aria-label="Drag to reorder"
                            className="cursor-grab"
                            onDragStart={() =>
                              setDraggedMedia({ kind: "library", index })
                            }
                          >
                            <IconGripVertical />
                          </AttachmentAction>
                          <AttachmentAction
                            type="button"
                            aria-label="Replace image"
                            onClick={() => {
                              setReplaceTarget({ kind: "library", index });
                              void openMediaLibrary();
                            }}
                          >
                            <IconPhoto />
                          </AttachmentAction>
                          <AttachmentAction
                            type="button"
                            aria-label="Remove image"
                            onClick={() => removeLibraryMedia(index)}
                          >
                            <IconX />
                          </AttachmentAction>
                        </AttachmentActions>
                      </Attachment>
                    ))}
                    {mediaFiles.map((media, index) => (
                      <Attachment
                        key={`${media.name}-${index}`}
                        orientation="vertical"
                        size="sm"
                        state="done"
                        className="!w-[120px] min-h-[164px]"
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          if (draggedMedia?.kind === "local")
                            reorderMedia("local", draggedMedia.index, index);
                          setDraggedMedia(null);
                        }}
                      >
                        <AttachmentMedia
                          variant="image"
                          className="!h-[120px] !w-full aspect-square"
                        >
                          <img
                            src={media.preview}
                            alt={media.name}
                            className="!h-full !w-full object-cover"
                          />
                        </AttachmentMedia>
                        <AttachmentContent className="!w-full px-2 pb-2">
                          <AttachmentTitle>{media.name}</AttachmentTitle>
                          <AttachmentDescription>
                            {media.file.type.split("/")[1]?.toUpperCase() ||
                              "IMAGE"}{" "}
                            · {formatBytes(media.file.size)}
                          </AttachmentDescription>
                        </AttachmentContent>
                        <AttachmentActions>
                          <AttachmentAction
                            type="button"
                            draggable
                            aria-label="Drag to reorder"
                            className="cursor-grab"
                            onDragStart={() =>
                              setDraggedMedia({ kind: "local", index })
                            }
                          >
                            <IconGripVertical />
                          </AttachmentAction>
                          <AttachmentAction
                            type="button"
                            aria-label="Replace image"
                            onClick={() => {
                              setReplaceTarget({ kind: "local", index });
                              document
                                .getElementById("product-media-replace-input")
                                ?.click();
                            }}
                          >
                            <IconPhoto />
                          </AttachmentAction>
                          <AttachmentAction
                            type="button"
                            aria-label="Remove image"
                            onClick={() => removeLocalMedia(index)}
                          >
                            <IconX />
                          </AttachmentAction>
                        </AttachmentActions>
                      </Attachment>
                    ))}
                  </AttachmentGroup>
                ) : (
                  <div className="flex min-h-28 items-center justify-center text-center text-sm text-muted-foreground">
                    No product images selected yet.
                  </div>
                )}
                {product.media.length + mediaFiles.length < 6 && (
                  <div
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleMediaDrop}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-5 text-center transition-colors hover:border-ring hover:bg-muted/40"
                  >
                    <p className="text-sm font-medium">Drop images here</p>
                    <p className="text-xs text-muted-foreground">
                      JPEG, PNG, or WebP · max 10 MB each ·{" "}
                      {product.media.length + mediaFiles.length}/6 selected
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          document
                            .getElementById("product-media-input")
                            ?.click()
                        }
                      >
                        <IconUpload /> Upload images
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void openMediaLibrary()}
                      >
                        <IconPhoto /> Browse media library
                      </Button>
                    </div>
                  </div>
                )}
                <input
                  id="product-media-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    if (event.target.files) addFiles(event.target.files);
                    event.currentTarget.value = "";
                  }}
                />
                <input
                  id="product-media-replace-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    if (event.target.files && replaceTarget?.kind === "local")
                      replaceLocalFile(
                        replaceTarget.index,
                        event.target.files[0],
                      );
                    event.currentTarget.value = "";
                  }}
                />
              </div>
            </div>
            {mediaError && (
              <p className="mt-3 text-sm text-destructive">{mediaError}</p>
            )}
          </section>

          <section
            className={`${cardClass} ${step === "variants" ? "" : "hidden"} grid gap-5 p-6 lg:p-7`}
          >
            <h2 className="font-semibold">Pricing</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className={fieldClass}>
                Price
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={product.price}
                  onChange={(event) =>
                    update("price", Number(event.target.value))
                  }
                />
              </label>
              <label className={fieldClass}>
                Compare-at price
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={product.compare_at_price ?? ""}
                  onChange={(event) =>
                    update(
                      "compare_at_price",
                      event.target.value ? Number(event.target.value) : null,
                    )
                  }
                />
              </label>
              <label className={fieldClass}>
                Currency
                <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-medium">
                  ₹ Indian Rupee (INR)
                </div>
              </label>
            </div>
          </section>

          <section
            className={`${cardClass} ${step === "variants" ? "" : "hidden"} grid gap-5 p-6 lg:p-7`}
          >
            <div>
              <h2 className="font-semibold">Inventory</h2>
              <p className="text-sm text-muted-foreground">
                Track this product by SKU and available quantity.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={fieldClass}>
                SKU
                <Input
                  value={product.sku}
                  onChange={(event) => {
                    setSkuTouched(true);
                    update("sku", event.target.value.toUpperCase());
                  }}
                />
              </label>
              {product.product_type === "physical" && (
                <label className={fieldClass}>
                  Quantity
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={product.stock ?? 0}
                    onChange={(event) =>
                      update("stock", Number(event.target.value))
                    }
                  />
                </label>
              )}
            </div>
          </section>

          <section
            className={`${cardClass} ${step === "variants" ? "" : "hidden"} p-6 lg:p-7`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Variants</h2>
                <p className="text-sm text-muted-foreground">
                  Add options such as size, color, or format.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addVariant}
              >
                <IconPlus /> Add variant
              </Button>
            </div>
            {product.variants.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                This product has no variants.
              </div>
            ) : (
              <div className="grid gap-3">
                {product.variants.map((variant, index) => {
                  const existingLevels = variant.inventory_levels || [];
                  const draftLevel =
                    variant.inventory?.[0] ||
                    (existingLevels[0]
                      ? {
                          location_id: existingLevels[0].location_id,
                          on_hand: existingLevels[0].on_hand,
                          reorder_point: existingLevels[0].reorder_point,
                        }
                      : undefined);
                  return (
                    <div
                      key={variant.id || index}
                      className="grid gap-3 rounded-lg border p-3"
                    >
                      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_110px_90px_auto] sm:items-end">
                        <label className={fieldClass}>
                          Option value
                          <Input
                            value={variant.label}
                            onChange={(event) =>
                              updateVariant(index, {
                                label: event.target.value,
                                options: { title: event.target.value },
                              })
                            }
                            placeholder="Black / Large"
                          />
                        </label>
                        <label className={fieldClass}>
                          SKU
                          <Input
                            value={variant.sku}
                            onChange={(event) =>
                              updateVariant(index, {
                                sku: event.target.value.toUpperCase(),
                              })
                            }
                          />
                        </label>
                        <label className={fieldClass}>
                          Price
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={variant.price}
                            onChange={(event) =>
                              updateVariant(index, {
                                price: Number(event.target.value),
                              })
                            }
                          />
                        </label>
                        {product.product_type === "physical" && (
                          <label className={fieldClass}>
                            Stock
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={variant.stock ?? 0}
                              onChange={(event) =>
                                updateVariant(index, {
                                  stock: Number(event.target.value),
                                })
                              }
                            />
                          </label>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove variant ${index + 1}`}
                          onClick={() =>
                            setProduct((current) => ({
                              ...current,
                              variants: current.variants.filter(
                                (_, row) => row !== index,
                              ),
                            }))
                          }
                        >
                          <IconTrash />
                        </Button>
                      </div>
                      {product.product_type === "physical" && (
                        <div className="grid gap-3 rounded-lg bg-muted/40 p-3 sm:grid-cols-[1fr_120px_120px] sm:items-end">
                          <label className={fieldClass}>
                            Initial location
                            <ProductSelect
                              value={draftLevel?.location_id || "none"}
                              disabled={Boolean(variant.id)}
                              onValueChange={(value) =>
                                updateVariant(index, {
                                  inventory: [
                                    {
                                      location_id:
                                        value === "none" ? "" : value,
                                      on_hand: draftLevel?.on_hand || 0,
                                      reorder_point:
                                        draftLevel?.reorder_point || 0,
                                    },
                                  ],
                                })
                              }
                              placeholder="Select location"
                              options={[
                                { value: "none", label: "Select location" },
                                ...inventoryLocations
                                  .filter((location) => location.is_active)
                                  .map((location) => ({
                                    value: location.id,
                                    label: `${location.name} (${location.code})`,
                                  })),
                              ]}
                            />
                          </label>
                          <label className={fieldClass}>
                            On hand
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={draftLevel?.on_hand ?? 0}
                              disabled={Boolean(variant.id)}
                              onChange={(event) =>
                                updateVariant(index, {
                                  inventory: [
                                    {
                                      location_id:
                                        draftLevel?.location_id || "",
                                      on_hand: Number(event.target.value),
                                      reorder_point:
                                        draftLevel?.reorder_point || 0,
                                    },
                                  ],
                                })
                              }
                            />
                          </label>
                          <label className={fieldClass}>
                            Reorder point
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={draftLevel?.reorder_point ?? 0}
                              disabled={Boolean(variant.id)}
                              onChange={(event) =>
                                updateVariant(index, {
                                  inventory: [
                                    {
                                      location_id:
                                        draftLevel?.location_id || "",
                                      on_hand: draftLevel?.on_hand || 0,
                                      reorder_point: Number(event.target.value),
                                    },
                                  ],
                                })
                              }
                            />
                          </label>
                          {variant.id && (
                            <p className="sm:col-span-3 text-xs text-muted-foreground">
                              Existing inventory is protected from product
                              edits. Use the Inventory workspace to adjust
                              reserved-safe stock levels.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section
            className={`${cardClass} ${step === "basics" ? "" : "hidden"} grid gap-5 p-6 lg:p-7`}
          >
            <h2 className="font-semibold">Search engine listing</h2>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm text-blue-600">
                {product.title || "Product title"}
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                /product/{product.slug || "product-handle"}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {product.description ||
                  "Add a description to preview how this product could appear in search results."}
              </p>
            </div>
            <label className={fieldClass}>
              URL handle
              <Input
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                value={product.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  update("slug", event.target.value);
                }}
              />
            </label>
          </section>
        </div>

        <aside className="grid gap-0">
          <section
            className={`${cardClass} ${step === "options" ? "" : "hidden"} grid gap-5 p-6`}
          >
            <h2 className="font-semibold">Status</h2>
            <label className={fieldClass}>
              <span className="sr-only">Product status</span>
              <ProductSelect
                value={product.status}
                onValueChange={(value) =>
                  update("status", value as ProductDraft["status"])
                }
                placeholder="Status"
                options={[
                  { value: "draft", label: "Draft" },
                  { value: "active", label: "Active" },
                  { value: "archived", label: "Archived" },
                ]}
              />
            </label>
            {product.status === "active" &&
              product.rights_status === "review_required" && (
                <p className="text-xs text-destructive">
                  Rights review must be completed before publishing.
                </p>
              )}
          </section>

          <section
            className={`${cardClass} ${step === "options" ? "" : "hidden"} grid gap-4 p-6`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">Product options</h2>
                <p className="text-sm text-muted-foreground">
                  Add options such as Color or Size, then generate every variant
                  combination.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setOptionGroups((current) => [
                    ...current,
                    { name: "", values: "" },
                  ])
                }
              > Add option
              </Button>
            </div>
            <div className="grid gap-3">
              {optionGroups.map((group, index) => (
                <div
                  key={index}
                  className="grid gap-3 sm:grid-cols-[.8fr_1.2fr_auto]"
                >
                  <Input
                    placeholder="Option name (e.g. Color)"
                    value={group.name}
                    onChange={(event) =>
                      setOptionGroups((current) =>
                        current.map((item, row) =>
                          row === index
                            ? { ...item, name: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                  <Input
                    placeholder="Values separated by commas"
                    value={group.values}
                    onChange={(event) =>
                      setOptionGroups((current) =>
                        current.map((item, row) =>
                          row === index
                            ? { ...item, values: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove option"
                    onClick={() =>
                      setOptionGroups((current) =>
                        current.filter((_, row) => row !== index),
                      )
                    }
                  >
                    <IconTrash />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" onClick={generateVariants} className="w-fit">
              Generate variants
            </Button>
          </section>

          <section
            className={`${cardClass} ${step === "options" ? "" : "hidden"} grid gap-5 p-6`}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Product organization</h2>
              <IconChevronDown className="size-4 text-muted-foreground" />
            </div>
            <label className={fieldClass}>
              Category
              <ProductSelect
                value={product.category_id || "none"}
                onValueChange={(value) => {
                  update("category_id", value === "none" ? null : value);
                  update("subcategory_id", null);
                }}
                placeholder="Category"
                options={[
                  { value: "none", label: "Uncategorized" },
                  ...categories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
                ]}
              />
            </label>
            <label className={fieldClass}>
              Subcategory
              <ProductSelect
                value={product.subcategory_id || "none"}
                disabled={!product.category_id}
                onValueChange={(value) =>
                  update("subcategory_id", value === "none" ? null : value)
                }
                placeholder="Subcategory"
                options={[
                  { value: "none", label: "None" },
                  ...subcategories.map((subcategory) => ({
                    value: subcategory.id,
                    label: subcategory.name,
                  })),
                ]}
              />
            </label>
            <label className={fieldClass}>
              Product type
              <ProductSelect
                value={product.product_type}
                onValueChange={(value) =>
                  update("product_type", value as ProductDraft["product_type"])
                }
                placeholder="Product type"
                options={[
                  { value: "physical", label: "Physical" },
                  { value: "digital", label: "Digital" },
                ]}
              />
            </label>
          </section>

          <section
            className={`${cardClass} ${step === "options" ? "" : "hidden"} grid gap-5 p-6`}
          >
            <div className="flex items-center gap-2">
              <IconBox className="size-4" />
              <h2 className="font-semibold">Rights & origin</h2>
            </div>
            <label className={fieldClass}>
              Design origin
              <ProductSelect
                value={product.design_origin}
                onValueChange={(value) =>
                  update(
                    "design_origin",
                    value as ProductDraft["design_origin"],
                  )
                }
                placeholder="Design origin"
                options={[
                  { value: "original_zerocraft", label: "Original ZeroCraft" },
                  { value: "licensed", label: "Licensed" },
                  { value: "fan_inspired", label: "Fan inspired" },
                ]}
              />
            </label>
            <label className={fieldClass}>
              Rights status
              <ProductSelect
                value={product.rights_status}
                onValueChange={(value) =>
                  update(
                    "rights_status",
                    value as ProductDraft["rights_status"],
                  )
                }
                placeholder="Rights status"
                options={[
                  { value: "not_applicable", label: "Not applicable" },
                  { value: "approved_license", label: "Approved licence" },
                  { value: "review_required", label: "Review required" },
                ]}
              />
            </label>
          </section>
        </aside>
      </div>

      <footer className="mx-auto mt-8 flex w-full max-w-[760px] items-center justify-between border-t border-border px-6 py-6 sm:px-8">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            stepIndex > 0 && goToStep(productSteps[stepIndex - 1].id)
          }
          disabled={stepIndex === 0}
        >
          Back
        </Button>
        {step === "variants" ? (
          <Button
            type="submit"
            disabled={saving || !product.title || !product.slug || !product.sku}
          >
            {saving
              ? "Saving…"
              : mode === "create"
                ? "Create"
                : "Save changes"}
          </Button>
        ) : (
          <Button type="button" onClick={continueToNextStep}>
            Continue <span aria-hidden="true">→</span>
          </Button>
        )}
      </footer>
      <Dialog open={mediaLibraryOpen} onOpenChange={setMediaLibraryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Browse media library</DialogTitle>
            <DialogDescription>
              Select an existing image or replace the selected attachment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Input
              placeholder="Search images…"
              value={mediaLibraryQuery}
              onChange={(event) => setMediaLibraryQuery(event.target.value)}
            />
            {mediaLibraryLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Loading media library…
              </div>
            ) : (
              <div className="grid max-h-[420px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
                {mediaLibrary
                  .filter((asset) =>
                    asset.name
                      .toLowerCase()
                      .includes(mediaLibraryQuery.toLowerCase()),
                  )
                  .map((asset) => {
                    const selected = product.media.some(
                      (item) => item.public_url === asset.url,
                    );
                    return (
                      <button
                        key={asset.path}
                        type="button"
                        disabled={selected && !replaceTarget}
                        onClick={() => selectLibraryAsset(asset)}
                        className={`group overflow-hidden rounded-xl border text-left transition hover:border-ring ${selected ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                      >
                        <div className="aspect-square bg-muted">
                          <img
                            src={asset.url}
                            alt={asset.name}
                            className="size-full object-cover transition group-hover:scale-[1.02]"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2 p-2">
                          <span className="truncate text-xs font-medium">
                            {asset.name}
                          </span>
                          {selected && <Badge variant="secondary">Added</Badge>}
                        </div>
                      </button>
                    );
                  })}
                {!mediaLibrary.length && !mediaLibraryLoading && (
                  <div className="col-span-full rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No images found in the media library.
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMediaLibraryOpen(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}


