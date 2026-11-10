import { toast } from "@zerocraft/ui/components/toast";

type ToastType = "success" | "error" | "info" | "warning";
type PromiseToastMessages<Value> = {
  loading: string;
  success: string | ((value: Value) => string);
  error: string | ((error: unknown) => string);
};

function showToast(
  type: ToastType,
  title: string,
  description?: string,
): void {
  toast.add({ type, title, description });
}

export const studioToast = {
  success: (title: string, description?: string) =>
    showToast("success", title, description),
  error: (title: string, description?: string) =>
    showToast("error", title, description),
  info: (title: string, description?: string) =>
    showToast("info", title, description),
  warning: (title: string, description?: string) =>
    showToast("warning", title, description),
  promise: <Value,>(
    promise: Promise<Value>,
    messages: PromiseToastMessages<Value>,
  ): Promise<Value> =>
    toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: (caught: unknown) =>
        typeof messages.error === "function"
          ? messages.error(caught)
          : messages.error,
    }),
};
