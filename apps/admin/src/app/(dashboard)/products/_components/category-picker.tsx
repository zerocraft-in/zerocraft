"use client";

import * as React from "react";
import { Input } from "@zerocraft/ui/input";
import { Button } from "@zerocraft/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  fetchTaxonomyVertical,
  type TaxonomyCategory,
} from "@/lib/taxonomy";
import type { ProductFormValues } from "@/app/(dashboard)/products/lib/product-schema";
import type { UseFormReturn } from "react-hook-form";

type TaxonomyRow = TaxonomyCategory;

const TAXONOMY_VERSION = "2026-11";

function attributeLabels(row: TaxonomyRow | null): string[] {
  if (!row) return [];

  return (row.attributes ?? [])
    .map((attribute) => attribute.name || attribute.handle)
    .filter((label): label is string => Boolean(label));
}

export function CategoryPicker({
  form,
  organizationId,
}: {
  form: UseFormReturn<ProductFormValues>;
  organizationId: string;
}) {
  const selectedId = form.watch("category_id");

  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<TaxonomyRow | null>(null);
  const [open, setOpen] = React.useState(false);
  const [parent, setParent] = React.useState<TaxonomyRow | null>(null);
  const [breadcrumbs, setBreadcrumbs] = React.useState<TaxonomyRow[]>([]);

  const [rootPrefixes, setRootPrefixes] = React.useState<string[]>([]);
  const [rootsLoading, setRootsLoading] = React.useState(true);
  const [rootsError, setRootsError] = React.useState<string | null>(null);

  const [categories, setCategories] = React.useState<TaxonomyRow[] | null>(null);
  const [loadedRootKey, setLoadedRootKey] = React.useState("");
  const [taxonomyLoading, setTaxonomyLoading] = React.useState(false);
  const [taxonomyError, setTaxonomyError] = React.useState<string | null>(null);

  // Organization-specific enabled roots remain in Supabase.
  React.useEffect(() => {
    let cancelled = false;

    async function loadEnabledRoots() {
      setRootsLoading(true);
      setRootsError(null);

      try {
        const supabase = createBrowserSupabaseClient();

        const { data, error } = await supabase
          .from("taxonomy")
          .select("category_id")
          .eq("organization_id", organizationId)
          .eq("version", TAXONOMY_VERSION)
          .eq("enabled", true)
          .order("position", { ascending: true });

        if (error) {
          throw new Error(error.message);
        }

        if (cancelled) return;

        const prefixes = (data ?? [])
          .map((row) => {
            const gid = row.category_id.split("/").at(-1) ?? "";
            return gid.split("-")[0];
          })
          .filter((prefix): prefix is string => /^[a-z]{2}$/.test(prefix));

        setRootPrefixes([...new Set(prefixes)]);
        setCategories(null);
        setLoadedRootKey("");
      } catch (error) {
        if (!cancelled) {
          setRootPrefixes([]);
          setRootsError(
            error instanceof Error
              ? error.message
              : "Unable to load organization category groups.",
          );
        }
      } finally {
        if (!cancelled) {
          setRootsLoading(false);
        }
      }
    }

    void loadEnabledRoots();

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  // Fetch only the verticals enabled by this organization.
  React.useEffect(() => {
    if (!open || rootsLoading || rootPrefixes.length === 0) return;

    const rootKey = [...rootPrefixes].sort().join(",");

    if (loadedRootKey === rootKey && categories !== null) return;

    let cancelled = false;

    async function loadEnabledVerticals() {
      setTaxonomyLoading(true);
      setTaxonomyError(null);

      try {
        const verticals = await Promise.all(
          rootPrefixes.map((prefix) => fetchTaxonomyVertical(prefix)),
        );

        if (cancelled) return;

        const allCategories = verticals.flatMap(
          (vertical) => vertical.categories,
        );

        setCategories(allCategories);
        setLoadedRootKey(rootKey);
      } catch (error) {
        if (!cancelled) {
          setCategories(null);
          setTaxonomyError(
            error instanceof Error
              ? error.message
              : "Unable to load taxonomy categories.",
          );
        }
      } finally {
        if (!cancelled) {
          setTaxonomyLoading(false);
        }
      }
    }

    void loadEnabledVerticals();

    return () => {
      cancelled = true;
    };
  }, [open, rootsLoading, rootPrefixes, loadedRootKey, categories]);

  // Resolve an existing selection, even if its root is no longer enabled.
  React.useEffect(() => {
    if (!selectedId) return;

    const categoryId = selectedId;
    const gid = categoryId.split("/").at(-1) ?? "";
    const prefix = gid.split("-")[0];

    if (!/^[a-z]{2}$/.test(prefix)) return;

    let cancelled = false;

    async function loadSelectedCategory() {
      try {
        const vertical = await fetchTaxonomyVertical(prefix);

        const category =
          vertical.categories.find((item) => item.id === categoryId) ?? null;

        if (!cancelled) {
          setSelected(category);
        }
      } catch {
        if (!cancelled) {
          setSelected(null);
        }
      }
    }

    void loadSelectedCategory();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // Display only the category matching the current form value.
  const displaySelected =
    selectedId && selected?.id === selectedId ? selected : null;

  // Search loaded categories or show children of the current parent.
  const results = React.useMemo(() => {
    if (!categories) return [];

    const normalizedQuery = query.trim().toLocaleLowerCase();

    return categories
      .filter((category) => {
        if (normalizedQuery) {
          return (
            category.name.toLocaleLowerCase().includes(normalizedQuery) ||
            category.full_name.toLocaleLowerCase().includes(normalizedQuery)
          );
        }

        return category.parent_id === (parent?.id ?? null);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, parent, query]);

  const openPicker = () => {
    setOpen(true);
    setQuery("");
    setParent(null);
    setBreadcrumbs([]);
    setTaxonomyError(null);
  };

  const choose = (item: TaxonomyRow) => {
    if (item.children.length > 0) {
      setBreadcrumbs((current) => [...current, item]);
      setParent(item);
      setQuery("");
      return;
    }

    form.setValue("category_id", item.id, {
      shouldDirty: true,
      shouldValidate: true,
    });

    setSelected(item);
    setOpen(false);
    setQuery("");
  };

  const goBack = () => {
    const next = breadcrumbs.slice(0, -1);
    setBreadcrumbs(next);
    setParent(next.at(-1) ?? null);
    setQuery("");
  };

  const fields = attributeLabels(displaySelected);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Category</label>

        {selectedId && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              form.setValue("category_id", null, {
                shouldDirty: true,
                shouldValidate: true,
              });
              setSelected(null);
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {displaySelected ? (
        <button
          type="button"
          className="w-full rounded-md border bg-muted/30 px-3 py-2 text-left text-sm"
          onClick={openPicker}
        >
          <span className="font-medium">{displaySelected.name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {displaySelected.full_name}
          </span>
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start"
          onClick={openPicker}
        >
          Choose a product category
        </Button>
      )}

      {open && (
        <div
          className="rounded-md border bg-background shadow-sm"
          role="dialog"
          aria-label="Choose a product category"
        >
          <div className="p-3 pb-2">
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search categories"
            />
          </div>

          {!query.trim() && breadcrumbs.length > 0 && (
            <button
              type="button"
              className="w-full border-y px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
              onClick={goBack}
            >
              ← Back to{" "}
              {breadcrumbs.length > 1
                ? breadcrumbs.at(-2)?.name
                : "All"}
            </button>
          )}

          <div className="max-h-64 overflow-auto p-1">
            {rootsLoading || taxonomyLoading ? (
              <p className="p-3 text-xs text-muted-foreground">
                Loading categories…
              </p>
            ) : rootsError ? (
              <p role="alert" className="p-3 text-xs text-destructive">
                Unable to load organization groups: {rootsError}
              </p>
            ) : taxonomyError ? (
              <p role="alert" className="p-3 text-xs text-destructive">
                Unable to load categories: {taxonomyError}
              </p>
            ) : rootPrefixes.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground">
                No category groups are enabled for this organization.
                Enable them in organization settings.
              </p>
            ) : results.length === 0 ? (
              parent && !query.trim() ? (
                <button
                  type="button"
                  className="w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => choose({ ...parent, children: [] })}
                >
                  <span className="block font-medium">
                    Use {parent.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    No child categories are available in this taxonomy release.
                  </span>
                </button>
              ) : (
                <p className="p-3 text-xs text-muted-foreground">
                  No matching categories.
                </p>
              )
            ) : (
              results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => choose(item)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {item.name}
                    </span>
                    {query.trim() && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.full_name}
                      </span>
                    )}
                  </span>

                  {item.children.length > 0 && (
                    <span className="pl-3 text-muted-foreground">›</span>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="flex justify-end border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {displaySelected && fields.length > 0 && (
        <div className="rounded-md border bg-muted/10 p-3">
          <p className="text-sm font-medium">Category metafields</p>
          <p className="mt-1 text-xs text-muted-foreground">
            fields available for {displaySelected.name}.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {fields.map((field) => (
              <div
                key={field}
                className="rounded border bg-background px-3 py-2 text-sm"
              >
                {field}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Determines tax rates and adds metafields to improve search, filters,
        and cross-channel sales.
      </p>
    </div>
  );
}
