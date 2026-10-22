"use client";

import type { ReactNode } from "react";

export default function Magnetic({
  children,
}: {
  children: ReactNode;
  strength?: number;
}) {
  return <span className="inline-flex">{children}</span>;
}
