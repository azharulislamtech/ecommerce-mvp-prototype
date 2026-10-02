"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { CHECKOUT_ATTEMPT_STORAGE_KEY } from "@/lib/checkout-attempt";

export function ClearCartOnSuccess({ enabled }: { enabled: boolean }) {
  const { clearCart } = useCart();

  useEffect(() => {
    if (enabled) {
      clearCart();
      try { sessionStorage.removeItem(CHECKOUT_ATTEMPT_STORAGE_KEY); } catch { /* Storage can be disabled. */ }
    }
  }, [clearCart, enabled]);

  return null;
}
