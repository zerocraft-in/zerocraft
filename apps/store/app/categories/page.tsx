import type { Metadata } from "next";
import CategoriesCatalog from "@/components/sections/CategoriesCatalog";

export const metadata: Metadata = {
  title: "Explore categories",
  description:
    "Explore every Zerocraft collection, from graphic tees and hoodies to wall art, accessories, and digital drops.",
};

export default function CategoriesPage() {
  return <CategoriesCatalog />;
}
