"use client";

import { useEffect, useMemo, useState } from "react";
import type { CartItem } from "@/lib/store/useStore";
import type { CartValidationResponse } from "@/lib/commerce/cart-validation";

export function useCartValidation(cart: CartItem[]) {
  const [validation, setValidation] = useState<CartValidationResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const payload = useMemo(() => ({
    items: cart.map((item) => ({
      lineId: item.lineId,
      productId: item.product.id,
      ...(item.selectedVariantId ? { variantId: item.selectedVariantId } : {}),
      ...(item.customizationReference?.trim() ? { customizationReference: item.customizationReference.trim() } : {}),
      quantity: item.quantity,
      ...(item.selectedColor?.trim() ? { color: item.selectedColor.trim() } : {}),
      ...(item.selectedSize?.trim() ? { size: item.selectedSize.trim() } : {}),
    })),
  }), [cart]);

  useEffect(() => {
    if (!cart.length) return;
    const controller = new AbortController();
    let active = true;
    queueMicrotask(() => {
      if (active) {
        setIsValidating(true);
        setError(null);
      }
    });
    fetch("/api/store/cart/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json().catch(() => null);
        if (!response.ok || !result) throw new Error(result?.error || "Cart availability could not be checked.");
        setValidation(result as CartValidationResponse);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Cart availability could not be checked.");
        setValidation(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsValidating(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [cart, payload]);

  return {
    validation: cart.length ? validation : null,
    isValidating: cart.length ? isValidating : false,
    error: cart.length ? error : null,
  };
}
