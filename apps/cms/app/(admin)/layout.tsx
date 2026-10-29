import type { ReactNode } from "react";

/**
 * Reserved admin route group. Existing public URLs remain stable while new
 * platform routes can move here incrementally without changing their paths.
 */
export default function AdminRouteGroupLayout({ children }: { children: ReactNode }) {
  return children;
}
