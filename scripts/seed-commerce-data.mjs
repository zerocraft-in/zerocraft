export const categories = [
  ["posters", "Art Posters"],
  ["tamil-typography", "Tamil Typography"],
  ["illustrative-art", "Illustrative Art"],
  ["custom-posters", "Custom Posters"],
  ["photo-frames", "Photo Frames"],
  ["t-shirts", "T-Shirts"],
  ["couples-t-shirts", "Couples T-Shirts"],
  ["keychains-tags", "Keychains & Tags"],
  ["digital-artwork", "Digital Artwork"],
];

export const collections = [
  ["zero-lines", "Zero Lines", "Original typography and graphic studies"],
  ["tamil-form", "Tamil Form", "Original Tamil lettering experiments"],
  ["made-for-you", "Made For You", "Customizable pieces for meaningful spaces"],
];

export const productGroups = [
  ["posters", "Typography Poster", 12],
  ["illustrative-art", "Illustrative Poster", 12],
  ["tamil-typography", "Tamil Typography Artwork", 8],
  ["custom-posters", "Custom Poster Template", 8],
  ["photo-frames", "Photo Frame", 8],
  ["t-shirts", "Graphic T-Shirt", 8],
  ["couples-t-shirts", "Couples T-Shirt", 6],
  ["keychains-tags", "Keychain & Tag", 6],
  ["digital-artwork", "Digital Artwork", 4],
];

export const DEMO_PRODUCT_COUNT = productGroups.reduce((total, [, , count]) => total + count, 0);

const priceBases = {
  posters: 699,
  "illustrative-art": 799,
  "tamil-typography": 749,
  "custom-posters": 999,
  "photo-frames": 1499,
  "t-shirts": 1199,
  "couples-t-shirts": 2199,
  "keychains-tags": 399,
  "digital-artwork": 299,
};

const placeholder = (label, width, height) => `https://placehold.co/${width}x${height}/png?text=${encodeURIComponent(`Zerocraft Demo - ${label}`)}`;

export function priceFor(group, index) {
  return (priceBases[group] + (index % 4) * 100) * 100;
}

export function variantDefinitions(group) {
  if (["posters", "illustrative-art", "tamil-typography", "custom-posters"].includes(group)) return [
    ["A4", 0],
    ["A3", 20000],
  ];
  if (group === "photo-frames") return [["8x10", 0], ["12x18", 40000], ["18x24", 80000]];
  if (["t-shirts", "couples-t-shirts"].includes(group)) return [["S", 0], ["M", 0], ["L", 0], ["XL", 10000]];
  return [["Standard", 0]];
}

export function buildDemoCatalog() {
  const products = [];
  for (const [category, label, count] of productGroups) {
    for (let index = 1; index <= count; index += 1) {
      const slug = `demo-${category}-${String(index).padStart(2, "0")}`;
      const sku = `DEMO-${category.toUpperCase()}-${String(index).padStart(3, "0")}`;
      const pricePaise = priceFor(category, index);
      products.push({
        category,
        slug,
        sku,
        title: `${label} ${String(index).padStart(2, "0")}`,
        description: "Original Zerocraft Studio demo artwork. Development data only; replace before launch.",
        product_type: category === "digital-artwork" ? "digital" : "physical",
        status: "active",
        price: pricePaise / 100,
        compare_at_price: (pricePaise + 20000) / 100,
        price_paise: pricePaise,
        compare_at_price_paise: pricePaise + 20000,
        currency: "INR",
        currency_code: "INR",
        stock: category === "digital-artwork" ? null : 12 + (index % 10),
        image_url: placeholder(label, 1200, 1600),
      });
    }
  }

  const variants = products.flatMap((product) => variantDefinitions(product.category).map(([label, surcharge]) => ({
    product_slug: product.slug,
    product_sku: product.sku,
    label,
    sku: `${product.sku}-${label.replaceAll("x", "X").toUpperCase()}`,
    options: label === "Standard" ? {} : { Size: label },
    price_paise: product.price_paise + surcharge,
    price: (product.price_paise + surcharge) / 100,
    currency: "INR",
    currency_code: "INR",
    stock: product.stock,
    is_active: true,
  })));

  const templates = products
    .filter((product) => product.category === "custom-posters")
    .map((product) => ({
      product_slug: product.slug,
      name: `${product.title} Customization`,
      slug: `${product.slug}-template`,
      schema: {
        fields: [
          { key: "artwork", type: "image", required: true, accept: ["image/jpeg", "image/png", "image/webp"] },
          { key: "headline", type: "text", required: false, maxLength: 80 },
        ],
      },
      preview_url: product.image_url,
      status: "published",
    }));

  return { products, variants, templates };
}

