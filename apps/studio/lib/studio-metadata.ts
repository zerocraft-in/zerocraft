import type { Metadata } from "next";
import { studio } from "./studio-config";

export function studioMetadata(title: string, description: string, path: string): Metadata {
  return { title, description, alternates: { canonical: `${studio.url}${path}` } };
}
