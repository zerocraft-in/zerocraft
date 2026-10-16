import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import CustomerCustomizer from "@/components/store/customer-customizer";

export const dynamic = "force-dynamic";

export default async function CustomizeProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: template } = await supabase.from("store_customization_templates").select("id,name,slug,schema,product:store_products!inner(id,title,slug,price,price_paise,currency,currency_code,sku,stock,product_type,store_product_variants(id,label,sku,price,price_paise,currency_code,stock,is_active))").eq("slug", slug).eq("status", "published").eq("product.status", "active").maybeSingle();
  if (!template?.product) notFound();
  const product = template.product as unknown as { id: string; title: string; slug: string; price: number | null; price_paise: number | null; currency: string | null; currency_code: string | null; sku: string; stock: number | null; product_type: string; store_product_variants?: { id: string; label: string; sku: string; price: number | null; price_paise: number | null; currency_code: string | null; stock: number | null; is_active: boolean }[] };
  return <CustomerCustomizer template={{ id: template.id, name: template.name, schema: template.schema }} product={product} />;
}
