"use client";

import { useState } from "react";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { clampCartQuantity } from "@/lib/cart";

type ProductPurchaseActionsProps = {
  productId: string;
  stock: number;
};

export function ProductPurchaseActions({ productId, stock }: ProductPurchaseActionsProps) {
  const [quantity, setQuantity] = useState(1);
  const safeQuantity = clampCartQuantity(quantity, stock || 1);
  const disabled = stock < 1;

  return (
    <>
      <div className="mt-5">
        <label className="text-sm font-semibold text-slate-950" htmlFor="quantity">
          Quantity
        </label>
        <div className="mt-2 flex h-12 w-36 items-center justify-between rounded-md border border-slate-200 bg-white px-2">
          <button
            className="grid h-9 w-9 place-items-center rounded-md text-lg font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
            disabled={disabled || safeQuantity <= 1}
            onClick={() => setQuantity((current) => clampCartQuantity(current - 1, stock || 1))}
            type="button"
          >
            -
          </button>
          <input
            className="w-10 border-0 bg-transparent text-center text-sm font-bold outline-none"
            disabled={disabled}
            id="quantity"
            min="1"
            max={Math.max(1, stock)}
            onChange={(event) => setQuantity(clampCartQuantity(Number(event.target.value), stock || 1))}
            type="number"
            value={safeQuantity}
          />
          <button
            className="grid h-9 w-9 place-items-center rounded-md text-lg font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
            disabled={disabled || safeQuantity >= stock}
            onClick={() => setQuantity((current) => clampCartQuantity(current + 1, stock || 1))}
            type="button"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <AddToCartButton
          checkout
          className="focus-ring inline-flex min-h-12 items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          label="Buy Now"
          productId={productId}
          quantity={safeQuantity}
          stock={stock}
        />
        <AddToCartButton
          className="focus-ring inline-flex min-h-12 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-950 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400"
          label="Add to Cart"
          productId={productId}
          quantity={safeQuantity}
          stock={stock}
        />
      </div>
    </>
  );
}
