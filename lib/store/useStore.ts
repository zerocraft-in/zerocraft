"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product, Order, DUMMY_ORDERS } from "@/lib/data/storeData";

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}

interface StoreState {
  // Cart State
  cart: CartItem[];
  cartDrawerOpen: boolean;
  couponCode: string;
  discountPercentage: number;
  giftNote: string;
  addToCart: (product: Product, quantity?: number, color?: string, size?: string) => void;
  removeFromCart: (productId: string, color?: string, size?: string) => void;
  updateQuantity: (productId: string, quantity: number, color?: string, size?: string) => void;
  clearCart: () => void;
  toggleCartDrawer: (open?: boolean) => void;
  applyCoupon: (code: string) => { success: boolean; message: string };
  setGiftNote: (note: string) => void;

  // Wishlist State
  wishlist: Product[];
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;

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
      cart: [
        {
          product: {
            id: "prod-1",
            slug: "minimal-mountain-poster",
            title: "Minimal Mountain Poster",
            shortDescription: "Monochrome topographical peaks on Japanese cotton paper.",
            description: "Modern minimalism alpine print.",
            category: "Posters",
            categorySlug: "posters",
            brand: "ZeroCraft Studio",
            price: 34.0,
            originalPrice: 48.0,
            rating: 4.9,
            reviewCount: 128,
            stock: 25,
            tags: ["Minimalist"],
            colors: [{ name: "Warm Cream", hex: "#f5f3ef" }],
            sizes: ['18" x 24"'],
            sku: "ZC-PST-001",
            shippingBadge: "Free Standard Shipping",
            isNew: true,
            isSale: true,
            images: ["https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1200&auto=format&fit=crop"],
            specifications: [],
          },
          quantity: 1,
          selectedColor: "Warm Cream",
          selectedSize: '18" x 24"',
        },
      ],
      cartDrawerOpen: false,
      couponCode: "",
      discountPercentage: 0,
      giftNote: "",

      addToCart: (product, quantity = 1, color, size) => {
        const { cart } = get();
        const chosenColor = color || (product.colors?.[0]?.name ?? "");
        const chosenSize = size || (product.sizes?.[0] ?? "");

        const existingIndex = cart.findIndex(
          (item) =>
            item.product.id === product.id &&
            item.selectedColor === chosenColor &&
            item.selectedSize === chosenSize
        );

        if (existingIndex > -1) {
          const updated = [...cart];
          updated[existingIndex].quantity += quantity;
          set({ cart: updated, cartDrawerOpen: true });
        } else {
          set({
            cart: [
              ...cart,
              {
                product,
                quantity,
                selectedColor: chosenColor,
                selectedSize: chosenSize,
              },
            ],
            cartDrawerOpen: true,
          });
        }
      },

      removeFromCart: (productId, color, size) => {
        set({
          cart: get().cart.filter(
            (item) =>
              !(
                item.product.id === productId &&
                (color === undefined || item.selectedColor === color) &&
                (size === undefined || item.selectedSize === size)
              )
          ),
        });
      },

      updateQuantity: (productId, quantity, color, size) => {
        if (quantity <= 0) {
          get().removeFromCart(productId, color, size);
          return;
        }
        set({
          cart: get().cart.map((item) => {
            if (
              item.product.id === productId &&
              (color === undefined || item.selectedColor === color) &&
              (size === undefined || item.selectedSize === size)
            ) {
              return { ...item, quantity };
            }
            return item;
          }),
        });
      },

      clearCart: () => set({ cart: [], couponCode: "", discountPercentage: 0, giftNote: "" }),

      toggleCartDrawer: (open) =>
        set((state) => ({
          cartDrawerOpen: open !== undefined ? open : !state.cartDrawerOpen,
        })),

      applyCoupon: (code) => {
        const cleanCode = code.trim().toUpperCase();
        if (cleanCode === "CRAFT10" || cleanCode === "WELCOME10") {
          set({ couponCode: cleanCode, discountPercentage: 10 });
          return { success: true, message: "10% discount coupon applied!" };
        } else if (cleanCode === "ZEROCRAFT20" || cleanCode === "LUXURY20") {
          set({ couponCode: cleanCode, discountPercentage: 20 });
          return { success: true, message: "20% VIP discount coupon applied!" };
        } else {
          return { success: false, message: "Invalid or expired coupon code. Try CRAFT10 or ZEROCRAFT20." };
        }
      },

      setGiftNote: (note) => set({ giftNote: note }),

      // Wishlist
      wishlist: [],
      toggleWishlist: (product) => {
        const { wishlist } = get();
        const exists = wishlist.some((item) => item.id === product.id);
        if (exists) {
          set({ wishlist: wishlist.filter((item) => item.id !== product.id) });
        } else {
          set({ wishlist: [...wishlist, product] });
        }
      },
      isInWishlist: (productId) => get().wishlist.some((item) => item.id === productId),
      clearWishlist: () => set({ wishlist: [] }),

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
      version: 2,
      migrate: (persisted) => {
        const state = persisted as Partial<StoreState>;
        return {
          ...state,
          orders: (state.orders || []).filter((order) => !DUMMY_ORDERS.some((sample) => sample.id === order.id)),
          userProfile: state.userProfile?.email === "julian.vance@zerocraft.in" ? {
            name: "", email: "", avatar: "", phone: "",
            address: { street: "", city: "", state: "", postalCode: "", country: "" },
          } : state.userProfile,
        } as StoreState;
      },
      partialize: (state) => ({
        cart: state.cart,
        wishlist: state.wishlist,
        couponCode: state.couponCode,
        discountPercentage: state.discountPercentage,
        userProfile: state.userProfile,
        orders: state.orders,
      }),
    }
  )
);
