"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "@/data/products";
import { COUPON } from "@/data/store";
import { unitPrice } from "@/lib/format";

export interface CartItem {
  id: number;
  size: string;
  qty: number;
  bundle?: boolean;
}
interface Store {
  catalog: Product[];
  items: CartItem[];
  wish: number[];
  coupon: boolean;
  cartOpen: boolean;
  quick: number | null;
  toast: { m: string; on: boolean };
  count: number;
  subtotal: number;
  discount: number;
  total: number;
  add: (id: number, size?: string, bundle?: boolean, quiet?: boolean) => void;
  inc: (i: number) => void;
  dec: (i: number) => void;
  remove: (i: number) => void;
  toggleWish: (id: number) => void;
  applyCoupon: (code: string) => boolean;
  clear: () => void;
  openCart: () => void;
  closeAll: () => void;
  openQuick: (id: number) => void;
  notify: (m: string) => void;
}
const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be inside StoreProvider");
  return s;
};

export function StoreProvider({ children, catalog = [] }: { children: ReactNode; catalog?: Product[] }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [wish, setWish] = useState<number[]>([]);
  const [coupon, setCoupon] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [quick, setQuick] = useState<number | null>(null);
  const [toast, setToast] = useState({ m: "", on: false });
  const [ready, setReady] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("padam-store") || "{}");
      if (s.items) setItems(s.items);
      if (s.wish) setWish(s.wish);
      if (s.coupon) setCoupon(true);
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(
          "padam-store",
          JSON.stringify({ items, wish, coupon }),
        );
      } catch {}
  }, [items, wish, coupon, ready]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCartOpen(false);
        setQuick(null);
      }
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  }, []);

  const notify = useCallback((m: string) => {
    setToast({ m, on: true });
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => setToast((t) => ({ ...t, on: false })),
      2300,
    );
  }, []);
  const add = useCallback(
    (id: number, size = "", bundle = false, quiet = false) => {
      setItems((a) => {
        const k = a.find(
          (x) => x.id === id && x.size === size && !!x.bundle === bundle,
        );
        return k
          ? a.map((x) => (x === k ? { ...x, qty: x.qty + 1 } : x))
          : [...a, { id, size, qty: 1, bundle }];
      });
      if (!quiet) notify(`${catalog[id]?.n ?? "Product"} added to cart`);
    },
    [catalog, notify],
  );
  const inc = (i: number) =>
    setItems((a) => a.map((x, k) => (k === i ? { ...x, qty: x.qty + 1 } : x)));
  const dec = (i: number) =>
    setItems((a) =>
      a.flatMap((x, k) =>
        k !== i ? [x] : x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : [],
      ),
    );
  const remove = (i: number) => setItems((a) => a.filter((_, k) => k !== i));
  const toggleWish = (id: number) => {
    const on = wish.includes(id);
    setWish(on ? wish.filter((x) => x !== id) : [...wish, id]);
    notify(on ? "Removed from wishlist" : "Saved to wishlist");
  };
  const applyCoupon = (code: string) => {
    if (code.trim().toUpperCase() === COUPON.code) {
      setCoupon(true);
      notify(`Coupon applied · ${COUPON.percent}% off`);
      return true;
    }
    notify("Invalid coupon code");
    return false;
  };
  const clear = () => {
    setItems([]);
    setCoupon(false);
  };

  const count = items.reduce((a, i) => a + i.qty, 0);
  const subtotal = items.reduce(
    (a, i) => a + unitPrice(catalog[i.id]?.pr ?? 0, i.bundle) * i.qty,
    0,
  );
  const discount = coupon ? Math.round((subtotal * COUPON.percent) / 100) : 0;
  const value: Store = {
    catalog,
    items,
    wish,
    coupon,
    cartOpen,
    quick,
    toast,
    count,
    subtotal,
    discount,
    total: subtotal - discount,
    add,
    inc,
    dec,
    remove,
    toggleWish,
    applyCoupon,
    clear,
    notify,
    openCart: () => {
      setQuick(null);
      setCartOpen(true);
    },
    closeAll: () => {
      setCartOpen(false);
      setQuick(null);
    },
    openQuick: (id) => {
      setCartOpen(false);
      setQuick(id);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
