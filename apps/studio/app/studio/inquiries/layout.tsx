import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ZeroCraft Studio — Pipeline",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="ml-18">{children}</div>;
}
