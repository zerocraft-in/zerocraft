export function buildSku(options: {
  category: string;
  gender?: string;
  size?: string;
  color?: string;
  variant?: string;
}): string {
  const parts = [
    options.category.toUpperCase(),
    options.gender?.toUpperCase(),
    options.color?.toUpperCase(),
    options.size?.toUpperCase(),
    options.variant?.toUpperCase(),
  ].filter(Boolean);
  return parts.join("-");
}

export function parseSku(sku: string): Record<string, string> {
  const parts = sku.split("-");
  return {
    category: parts[0] ?? "",
    gender: parts[1] ?? "",
    color: parts[2] ?? "",
    size: parts[3] ?? "",
    variant: parts[4] ?? "",
  };
}

export function validateSku(sku: string): boolean {
  return /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(sku);
}
