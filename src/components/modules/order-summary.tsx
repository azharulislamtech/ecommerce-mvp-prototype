import { CART_DISCOUNT, DELIVERY_CHARGE, calculateCartTotal } from "@/lib/cart";
import { cartDiscount, cartSubtotal, deliveryCharge as mockDeliveryCharge, formatMoney } from "@/lib/data";
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL, itemCountLabel } from "@/lib/order-copy";

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
      <h2 className="text-lg font-bold text-slate-950">অর্ডারের সারাংশ</h2>
      {typeof itemCount === "number" ? (
        <p className="mt-1 text-sm text-slate-500">{itemCountLabel(itemCount)}</p>
      ) : null}
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between gap-4 text-slate-600">
          <dt>পণ্যের দাম</dt>
          <dd className="font-semibold text-slate-900">{formatMoney(subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-slate-600">
          <dt>ডেলিভারি চার্জ</dt>
          <dd className="font-semibold text-slate-900" data-testid="order-delivery-charge">
            {formatMoney(deliveryCharge)}
          </dd>
        </div>
        {discount > 0 ? (
          <div className="flex justify-between gap-4 text-slate-600">
            <dt>ছাড়</dt>
            <dd className="font-semibold text-emerald-700">-{formatMoney(discount)}</dd>
          </div>
        ) : null}
        <div className="border-t border-slate-200 pt-3">
          <div className="flex justify-between gap-4 text-base font-bold text-slate-950">
            <dt>মোট</dt>
            <dd>{formatMoney(total)}</dd>
          </div>
        </div>
      </dl>
      {cta ? <div className="mt-5">{cta}</div> : null}
      <p className="mt-4 text-sm leading-6 text-slate-500">
        ডেলিভারি নিয়ে কোনো প্রশ্ন থাকলে ফোন করুন:{" "}
        <a className="font-semibold text-slate-700 hover:text-blue-700" href={SUPPORT_PHONE_TEL}>{SUPPORT_PHONE_DISPLAY}</a>
      </p>
    </section>
  );
}
