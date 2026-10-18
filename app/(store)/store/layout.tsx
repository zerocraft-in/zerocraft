import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ZEROPOP Store",
  description: "South Indian retro-cinema merchandise by ZEROPOP.",
};

export default function StorePagesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
