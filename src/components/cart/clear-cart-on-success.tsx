"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart/cart-provider";

export function ClearCartOnSuccess({ enabled }: { enabled: boolean }) {
  const { clearCart } = useCart();

  useEffect(() => {
    if (enabled) {
      clearCart();
    }
  }, [clearCart, enabled]);

  return null;
}
