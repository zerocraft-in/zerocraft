import { ProductEditor } from "@/components/studio/product-editor";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductEditor mode="edit" productId={id} />;
}
