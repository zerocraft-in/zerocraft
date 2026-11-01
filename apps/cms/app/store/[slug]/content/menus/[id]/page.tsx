import { MenusWorkspace } from "@/components/commerce/menus-workspace";

export default async function EditMenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MenusWorkspace mode="edit" id={id} />;
}
