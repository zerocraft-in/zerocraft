export const TAXONOMY_VERSION = "2026-11";

export type TaxonomyRoot = {
  id: string;
  prefix: string;
  name: string;
  category_count: number;
};

export type TaxonomyManifest = {
  version: string;
  roots: TaxonomyRoot[];
};

export type TaxonomyAttribute = {
  id: string;
  name: string;
  handle: string;
  description?: string;
  extended?: boolean;
};

export type TaxonomyChild = {
  id: string;
  name: string;
};

export type TaxonomyReturnReason = {
  id: string;
  name: string;
  handle: string;
  description?: string;
};

export type TaxonomyCategory = {
  id: string;
  name: string;
  full_name: string;
  parent_id: string | null;
  level: number;
  children: TaxonomyChild[];
  attributes: TaxonomyAttribute[];
  return_reasons: TaxonomyReturnReason[];
  ancestors: TaxonomyChild[];
  inherits_return_reasons: boolean;
  vertical_prefix: string;
};

export type TaxonomyVertical = {
  version: string;
  prefix: string;
  name: string;
  categories: TaxonomyCategory[];
};

function getTaxonomyApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_TAXONOMY_API_URL?.trim();

  if (!url) {
    throw new Error("NEXT_PUBLIC_TAXONOMY_API_URL is not configured.");
  }

  return url.replace(/\/+$/, "");
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getTaxonomyApiUrl()}${path}`);

  if (!response.ok) {
    throw new Error(
      `Taxonomy request failed (${response.status}): ${path}`,
    );
  }

  return response.json() as Promise<T>;
}

export async function fetchTaxonomyManifest(): Promise<TaxonomyManifest> {
  const manifest = await fetchJson<TaxonomyManifest>(
    "/v1/taxonomy/manifest",
  );

  if (
    manifest.version !== TAXONOMY_VERSION ||
    !Array.isArray(manifest.roots)
  ) {
    throw new Error("Invalid taxonomy manifest.");
  }

  return manifest;
}

export async function fetchTaxonomyVertical(
  prefix: string,
): Promise<TaxonomyVertical> {
  if (!/^[a-z]{2}$/.test(prefix)) {
    throw new Error("Invalid taxonomy vertical prefix.");
  }

  const vertical = await fetchJson<TaxonomyVertical>(
    `/v1/taxonomy/verticals/${encodeURIComponent(prefix)}`,
  );

  if (
    vertical.version !== TAXONOMY_VERSION ||
    vertical.prefix !== prefix ||
    !Array.isArray(vertical.categories)
  ) {
    throw new Error(`Invalid taxonomy vertical: ${prefix}`);
  }

  return {
    ...vertical,
    categories: vertical.categories.map((category) => ({
      ...category,
      vertical_prefix: prefix,
      children: category.children ?? [],
      attributes: category.attributes ?? [],
      return_reasons: category.return_reasons ?? [],
      ancestors: category.ancestors ?? [],
    })),
  };
}
