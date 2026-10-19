const optionAliases: Record<string, string> = {
  colour: "color",
  colours: "color",
  colourswatch: "color",
  colors: "color",
  colorswatch: "color",
  size: "size",
  sizes: "size",
};

export function normalizeVariantOptionName(name: string) {
  const normalized = name.trim().toLowerCase().replace(/[\s_-]+/g, "");
  return optionAliases[normalized] ?? normalized;
}

export function normalizeVariantOptions(options: Record<string, unknown> | null | undefined) {
  return Object.entries(options ?? {}).reduce<Record<string, string>>((result, [name, value]) => {
    if (typeof value !== "string") return result;
    const trimmedValue = value.trim();
    if (!trimmedValue) return result;
    result[normalizeVariantOptionName(name)] = trimmedValue;
    return result;
  }, {});
}

export function getVariantOption(options: Record<string, string> | null | undefined, name: string) {
  return normalizeVariantOptions(options)[normalizeVariantOptionName(name)] ?? null;
}
