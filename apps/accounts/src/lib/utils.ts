import { clsx, type ClassValue } from "clsx";

/** Class joiner. Tailwind is gone, so tailwind-merge is no longer needed. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
