import { redirect } from "next/navigation";

export default function NewProductPage() {
  redirect("/store/products/new");
}
