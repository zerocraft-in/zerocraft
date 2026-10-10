import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design Demo — Zerocraft Studio",
  description: "An experimental website design demonstration.",
  robots: { index: false, follow: false },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
