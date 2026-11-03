import type { Metadata } from "next";
import "./portfolio.css";

export const metadata: Metadata = {
  title: "ZEROCRAFT STUDIO | Bespoke Digital Architecture & Creative Engineering",
  description: "Specialized design engineering studio crafting high-performance digital products and software experiences.",
};

export default function PortfolioRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="portfolio-body">
        {children}
      </body>
    </html>
  );
}

