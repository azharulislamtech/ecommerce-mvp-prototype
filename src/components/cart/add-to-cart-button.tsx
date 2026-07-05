"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-provider";

type AddToCartButtonProps = {
  checkout?: boolean;
  className: string;
  label: string;
  productId: string;
  quantity?: number;
  stock: number;
};

export function AddToCartButton({
  checkout = false,
  className,
  label,
  productId,
  quantity = 1,
  stock
}: AddToCartButtonProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const disabled = stock < 1;

  return (
    <button
      className={className}
      data-product-id={productId}
      data-testid={checkout ? "buy-now-button" : "add-to-cart-button"}
      disabled={disabled}
      onClick={() => {
        if (disabled) {
          return;
        }

        addItem(productId, quantity, stock);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1300);

        if (checkout) {
          router.push("/checkout");
        }
      }}
      type="button"
    >
      {disabled ? "Sold Out" : added && !checkout ? "Added" : label}
    </button>
  );
}
