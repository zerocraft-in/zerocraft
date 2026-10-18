import type { Metadata } from "next";
import StorefrontHome from "@/app/(store)/page";

export const metadata: Metadata = {
  title: "ZEROPOP — South Indian retro-cinema merchandise",
  description: "Cinema streetwear for Tamil and Malayalam fans.",
};

export default function StorefrontPage() {
  return <StorefrontHome />;
}
