"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CART_STORAGE_KEY, type CartLine, clampCartQuantity, normalizeCartLines } from "@/lib/cart";

type CartContextValue = {
  addItem: (productId: string, quantity?: number, stockLimit?: number) => void;
  clearCart: () => void;
  hydrated: boolean;
  itemCount: number;
  items: CartLine[];
  removeItem: (productId: string) => void;
  setItemQuantity: (productId: string, quantity: number, stockLimit?: number) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStoredCart() {
  if (typeof window === "undefined") {
    return [] satisfies CartLine[];
  }

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return [] satisfies CartLine[];
    }

    return normalizeCartLines(
      parsed.map((line) => ({
        productId: String(line.productId ?? ""),
        quantity: Number(line.quantity ?? 0)
      }))
    );
  } catch {
    return [] satisfies CartLine[];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [items, setItems] = useState<CartLine[]>([]);

  useEffect(() => {
    // Read browser storage after hydration so SSR and the first client render agree.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(readStoredCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [hydrated, items]);

  const addItem = useCallback((productId: string, quantity = 1, stockLimit?: number) => {
    setItems((current) => {
      const existing = current.find((item) => item.productId === productId);
      const nextQuantity = (existing?.quantity ?? 0) + quantity;
      const withoutCurrent = current.filter((item) => item.productId !== productId);

      return normalizeCartLines(
        [...withoutCurrent, { productId, quantity: clampCartQuantity(nextQuantity, stockLimit) }],
        stockLimit ? { [productId]: stockLimit } : {}
      );
    });
  }, []);

  const setItemQuantity = useCallback((productId: string, quantity: number, stockLimit?: number) => {
    setItems((current) => {
      if (quantity < 1) {
        return current.filter((item) => item.productId !== productId);
      }

      return normalizeCartLines(
        current.map((item) =>
          item.productId === productId ? { ...item, quantity: clampCartQuantity(quantity, stockLimit) } : item
        ),
        stockLimit ? { [productId]: stockLimit } : {}
      );
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = useMemo(() => items.reduce((total, item) => total + item.quantity, 0), [items]);

  const value = useMemo(
    () => ({ addItem, clearCart, hydrated, itemCount, items, removeItem, setItemQuantity }),
    [addItem, clearCart, hydrated, itemCount, items, removeItem, setItemQuantity]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);

  if (!value) {
    throw new Error("useCart must be used within CartProvider.");
  }

  return value;
}
