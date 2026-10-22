"use client";

import { toast as shadcnToast } from "@/components/ui/toast";

export const toast = {
  success(message: string) {
    return shadcnToast.add({ title: message, type: "success" });
  },
  error(message: string) {
    return shadcnToast.add({
      title: message,
      type: "error",
      priority: "high",
    });
  },
  info(message: string) {
    return shadcnToast.add({ title: message, type: "info" });
  },
  warning(message: string) {
    return shadcnToast.add({ title: message, type: "warning" });
  },
};
