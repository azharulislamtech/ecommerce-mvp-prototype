import { CART_DISCOUNT, DELIVERY_CHARGE, calculateCartTotal } from "@/lib/cart";
import { cartDiscount, cartSubtotal, deliveryCharge as mockDeliveryCharge, formatMoney } from "@/lib/data";

type OrderSummaryProps = {
  cta?: React.ReactNode;
  deliveryCharge?: number;
  discount?: number;
  itemCount?: number;
  subtotal?: number;
};

export function OrderSummary({
  cta,
  deliveryCharge = mockDeliveryCharge || DELIVERY_CHARGE,
  discount = cartDiscount || CART_DISCOUNT,
  itemCount,
  subtotal = cartSubtotal
}: OrderSummaryProps) {
  const total = calculateCartTotal(subtotal, deliveryCharge, discount);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">Order Summary</h2>
      {typeof itemCount === "number" ? (
        <p className="mt-1 text-sm text-slate-500">{itemCount} {itemCount === 1 ? "item" : "items"}</p>
      ) : null}
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between gap-4 text-slate-600">
          <dt>Subtotal</dt>
          <dd className="font-semibold text-slate-900">{formatMoney(subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-slate-600">
          <dt>Delivery Charge</dt>
          <dd className="font-semibold text-slate-900">{formatMoney(deliveryCharge)}</dd>
        </div>
        {discount > 0 ? (
          <div className="flex justify-between gap-4 text-slate-600">
            <dt>Discount</dt>
            <dd className="font-semibold text-emerald-700">-{formatMoney(discount)}</dd>
          </div>
        ) : null}
        <div className="border-t border-slate-200 pt-3">
          <div className="flex justify-between gap-4 text-base font-bold text-slate-950">
            <dt>Total</dt>
            <dd>{formatMoney(total)}</dd>
          </div>
        </div>
      </dl>
      {cta ? <div className="mt-5">{cta}</div> : null}
      <p className="mt-4 text-sm leading-6 text-slate-500">
        Support is available before payment. Call 01700-000000 for delivery questions.
      </p>
    </section>
  );
}
