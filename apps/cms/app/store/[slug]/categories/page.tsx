import StoreCategoriesManager from "@/components/commerce/store-categories-manager";
import CategoryEditorPage from "@/components/commerce/category-editor-page";

export default async function StoreCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; categoryid?: string }>;
}) {
  const params = await searchParams;
  const categoryId = params.id || params.categoryid;
  if (categoryId) return <CategoryEditorPage categoryId={categoryId} />;
  return <StoreCategoriesManager />;
}
