"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product, Order, DUMMY_ORDERS } from "@/lib/data/storeData";
import { getCartLineId, MAX_CART_QUANTITY } from "@/lib/commerce/cart";

export interface CartItem {
  product: Product;
  quantity: number;
  lineId: string;
  selectedColor?: string;
  selectedSize?: string;
  selectedVariantId?: string;
  selectedVariantLabel?: string;
  customizationReference?: string;
  legacyUnvalidated?: boolean;
}

interface StoreState {
  // Cart State
  cart: CartItem[];
  cartDrawerOpen: boolean;
  giftNote: string;
  addToCart: (product: Product, quantity?: number, color?: string, size?: string, variantId?: string, variantLabel?: string, customizationReference?: string) => void;
  removeFromCart: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCartDrawer: (open?: boolean) => void;
  setGiftNote: (note: string) => void;

  // UI State
  searchModalOpen: boolean;
  quickViewProduct: Product | null;
  toggleSearchModal: (open?: boolean) => void;
  setQuickViewProduct: (product: Product | null) => void;

  // Account & Orders State
  userProfile: {
    name: string;
    email: string;
    avatar: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  orders: Order[];
  updateProfile: (profile: Partial<StoreState["userProfile"]>) => void;
  addOrder: (order: Order) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Cart
      cart: [],
      cartDrawerOpen: false,
      giftNote: "",

      addToCart: (product, quantity = 1, color, size, variantId, variantLabel, customizationReference) => {
        const { cart } = get();
        const chosenColor = color || (product.colors?.[0]?.name ?? "");
        const chosenSize = size || (product.sizes?.[0] ?? "");
        const lineId = getCartLineId({ productId: product.id, variantId, customizationReference });

        const existingIndex = cart.findIndex((item) => item.lineId === lineId);

        if (existingIndex > -1) {
          const updated = [...cart];
          updated[existingIndex].quantity = Math.min(MAX_CART_QUANTITY, updated[existingIndex].quantity + quantity);
          set({ cart: updated, cartDrawerOpen: true });
        } else {
          set({
            cart: [
              ...cart,
              {
                product,
                quantity: Math.min(MAX_CART_QUANTITY, Math.max(1, quantity)),
                lineId,
                selectedColor: chosenColor,
                selectedSize: chosenSize,
                selectedVariantId: variantId,
                selectedVariantLabel: variantLabel,
                customizationReference,
              },
            ],
            cartDrawerOpen: true,
          });
        }
      },

      removeFromCart: (lineId) => {
        set({ cart: get().cart.filter((item) => item.lineId !== lineId) });
      },

      updateQuantity: (lineId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(lineId);
          return;
        }
        set({
          cart: get().cart.map((item) => {
            return item.lineId === lineId ? { ...item, quantity: Math.min(MAX_CART_QUANTITY, quantity) } : item;
          }),
        });
      },

      clearCart: () => set({ cart: [], giftNote: "" }),

      toggleCartDrawer: (open) =>
        set((state) => ({
          cartDrawerOpen: open !== undefined ? open : !state.cartDrawerOpen,
        })),

      setGiftNote: (note) => set({ giftNote: note }),

      // UI
      searchModalOpen: false,
      quickViewProduct: null,
      toggleSearchModal: (open) =>
        set((state) => ({
          searchModalOpen: open !== undefined ? open : !state.searchModalOpen,
        })),
      setQuickViewProduct: (product) => set({ quickViewProduct: product }),

      // User Profile & Orders
      userProfile: {
        name: "",
        email: "",
        avatar: "",
        phone: "",
        address: {
          street: "",
          city: "",
          state: "",
          postalCode: "",
          country: "",
        },
      },
      orders: [],
      updateProfile: (profile) =>
        set((state) => ({
          userProfile: { ...state.userProfile, ...profile },
        })),
      addOrder: (order) =>
        set((state) => ({
          orders: [order, ...state.orders],
        })),
    }),
    {
      name: "zerocraft-store-storage",
      version: 3,
      migrate: (persisted) => {
        const state = persisted as Partial<StoreState>;
        const seen = new Set<string>();
        const cart = (Array.isArray(state.cart) ? state.cart : []).map((item, index) => {
          const legacyItem = item as CartItem;
          const baseLineId = getCartLineId({ productId: legacyItem.product?.id ?? "", variantId: legacyItem.selectedVariantId, customizationReference: legacyItem.customizationReference });
          const lineId = seen.has(baseLineId) ? `${baseLineId}::legacy-${index}` : baseLineId;
          seen.add(lineId);
          return { ...legacyItem, lineId, quantity: Math.min(MAX_CART_QUANTITY, Math.max(1, Number(legacyItem.quantity) || 1)), legacyUnvalidated: true };
        });
        return {
          ...state,
          cart,
          orders: (state.orders || []).filter((order) => !DUMMY_ORDERS.some((sample) => sample.id === order.id)),
          userProfile: state.userProfile,
        } as StoreState;
      },
      partialize: (state) => ({
        cart: state.cart,
        userProfile: state.userProfile,
        orders: state.orders,
      }),
    }
  )
);
