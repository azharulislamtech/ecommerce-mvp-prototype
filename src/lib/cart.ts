import { DEFAULT_DELIVERY_CHARGE } from "./delivery";

export const CART_STORAGE_KEY = "shoppilot-cart-v1";
export const DELIVERY_CHARGE = DEFAULT_DELIVERY_CHARGE;
export const CART_DISCOUNT = 0;
export const MAX_CART_LINES = 30;
export const MAX_CART_QUANTITY = 99;

export type CartLine = {
  productId: string;
  quantity: number;
};

export function clampCartQuantity(quantity: number, stockLimit = MAX_CART_QUANTITY) {
  const safeLimit = Math.max(1, Math.min(MAX_CART_QUANTITY, stockLimit));

  if (!Number.isFinite(quantity)) {
    return 1;
  }

  return Math.max(1, Math.min(safeLimit, Math.trunc(quantity)));
}

export function normalizeCartLines(lines: CartLine[], stockByProductId: Record<string, number> = {}) {
  const merged = new Map<string, number>();

  for (const line of lines) {
    if (!line.productId || !Number.isFinite(line.quantity)) {
      continue;
    }

    const nextQuantity = (merged.get(line.productId) ?? 0) + Math.trunc(line.quantity);
    merged.set(line.productId, nextQuantity);
  }

  return [...merged.entries()].slice(0, MAX_CART_LINES).map(([productId, quantity]) => ({
    productId,
    quantity: clampCartQuantity(quantity, stockByProductId[productId] ?? MAX_CART_QUANTITY)
  }));
}

export function calculateCartTotal(subtotal: number, deliveryCharge = DELIVERY_CHARGE, discount = CART_DISCOUNT) {
  return Math.max(0, subtotal + deliveryCharge - discount);
}
