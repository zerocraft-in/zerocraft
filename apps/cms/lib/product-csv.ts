export type ImportProduct = Record<string, unknown>;
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i+1] === '"') { cell += '"'; i++; }
      else if (quoted || cell === "") quoted = !quoted;
      else throw new Error("Invalid CSV quote.");
    } else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i+1] === "\n") i++;
      row.push(cell); if (row.some(v => v.trim())) rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (quoted) throw new Error("The CSV has an unclosed quoted field.");
  row.push(cell); if (row.some(v => v.trim())) rows.push(row);
  return rows;
}
const fields = ["Title","Handle","Variant SKU","Status","Product kind","Variant Price","Currency","Inventory quantity","Vendor","Type","Tags","Category ID","Subcategory ID","Image Src","Description","Variants JSON"];
export function productsCsv(products: ImportProduct[]): string {
  const escape = (value: unknown) => '"' + String(value ?? "").replaceAll('"','""') + '"';
  return "\uFEFF" + [fields, ...products.map(p => [p.title,p.slug,p.sku,p.status,p.product_type,p.price,p.currency,p.stock,p.vendor,p.merchandise_type,Array.isArray(p.tags) ? p.tags.join(", ") : "",p.category_id,p.subcategory_id,p.image_url,p.description,JSON.stringify(p.variants || [])])].map(row => row.map(escape).join(",")).join("\r\n");
}
export function csvProducts(text: string): ImportProduct[] {
  const [headers,...rows] = parseCsv(text);
  if (!headers || !rows.length) throw new Error("The CSV contains no products.");
  const names = headers.map(h => h.trim().toLowerCase());
  if (!names.includes("title") || !names.includes("handle")) throw new Error("CSV must include Title and Handle columns.");
  return rows.map((cells,index) => {
    if (cells.length !== headers.length) throw new Error(`CSV row ${index+2} has ${cells.length} fields; expected ${headers.length}.`);
    const get = (name: string) => cells[names.indexOf(name.toLowerCase())]?.trim() || "";
    const price = Number(get("Variant Price")); const quantity = get("Inventory quantity");
    if (!get("Title") || !get("Handle") || !get("Variant SKU") || !get("Variant Price") || !Number.isFinite(price) || price < 0 || (quantity && (!Number.isInteger(Number(quantity)) || Number(quantity)<0))) throw new Error(`CSV row ${index+2}: provide Title, Handle, Variant SKU, a nonnegative Variant Price, and valid inventory.`);
    let variants: unknown = [];
    if (get("Variants JSON")) { try { variants = JSON.parse(get("Variants JSON")); } catch { throw new Error(`CSV row ${index+2}: invalid Variants JSON.`); } if (!Array.isArray(variants)) throw new Error(`CSV row ${index+2}: Variants JSON must be an array.`); }
    return { title:get("Title"),slug:get("Handle"),sku:get("Variant SKU"),status:"draft",product_type:get("Product kind") || "physical",price,currency:get("Currency") || "INR",stock:quantity ? Number(quantity) : null,vendor:get("Vendor"),merchandise_type:get("Type"),tags:get("Tags").split(",").map(v=>v.trim()).filter(Boolean),category_id:get("Category ID") || null,subcategory_id:get("Subcategory ID") || null,image_url:get("Image Src"),description:get("Description"),variants };
  });
}
