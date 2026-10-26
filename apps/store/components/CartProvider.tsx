'use client';

import type React from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { COUPON, FREE_SHIP, SHIP_FEE, getProduct } from '@/lib/products';

export type Line = { slug: string; size: string; qty: number };

type CartStore = {
  lines: Line[];
  coupon: string | null;
  open: boolean;
  setOpen: (open: boolean) => void;
  add: (slug: string, size: string, qty?: number, openDrawer?: boolean) => void;
  setQty: (slug: string, size: string, qty: number) => void;
  remove: (slug: string, size: string) => void;
  applyCoupon: (code: string) => boolean;
  clearCoupon: () => void;
};

const STORAGE_KEY = 'zerocraft-cart-v1';

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      lines: [],
      coupon: null,
      open: false,
      setOpen: (open) => set({ open }),
      add: (slug, size, qty = 1, openDrawer = true) => set((state) => {
        const existing = state.lines.findIndex((line) => line.slug === slug && line.size === size);
        const lines = existing >= 0
          ? state.lines.map((line, index) => index === existing ? { ...line, qty: Math.min(10, line.qty + qty) } : line)
          : [...state.lines, { slug, size, qty: Math.min(10, Math.max(1, qty)) }];
        return { lines, ...(openDrawer ? { open: true } : {}) };
      }),
      setQty: (slug, size, qty) => set((state) => ({
        lines: state.lines.flatMap((line) => line.slug === slug && line.size === size
          ? (qty <= 0 ? [] : [{ ...line, qty: Math.min(10, qty) }])
          : [line]),
      })),
      remove: (slug, size) => set((state) => ({
        lines: state.lines.filter((line) => !(line.slug === slug && line.size === size)),
      })),
      applyCoupon: (code) => {
        if (code.trim().toUpperCase() !== COUPON) return false;
        set({ coupon: COUPON });
        return true;
      },
      clearCoupon: () => set({ coupon: null }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ lines, coupon }) => ({ lines, coupon }),
      version: 1,
    },
  ),
);

export function CartProvider({ children }: { children: React.ReactNode }) {
  return children;
}

export function useCart() {
  const { lines, coupon, open, setOpen, add, setQty, remove, applyCoupon, clearCoupon } = useCartStore();
  const count = lines.reduce((total, line) => total + line.qty, 0);
  const subtotal = lines.reduce((total, line) => total + (getProduct(line.slug)?.price ?? 0) * line.qty, 0);
  const discount = coupon ? Math.round(subtotal * 0.1) : 0;
  const afterDiscount = subtotal - discount;
  const shipping = subtotal === 0 || afterDiscount >= FREE_SHIP ? 0 : SHIP_FEE;

  return { lines, count, subtotal, discount, shipping, total: afterDiscount + shipping, coupon, open, setOpen, add, setQty, remove, applyCoupon, clearCoupon };
}
