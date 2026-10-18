import type { Metadata } from "next";
import SmoothScroll from "@/components/providers/SmoothScroll";
import "./index.css";

export const metadata: Metadata = {
  title: "ZEROPOP — South Indian retro-cinema merchandise",
  description: "Cinema streetwear for Tamil and Malayalam fans.",
};

export default function StoreLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <SmoothScroll>{children}</SmoothScroll>;
}
