import { cartDiscount, cartSubtotal, cartTotal, deliveryCharge, formatMoney } from "@/lib/data";

type OrderSummaryProps = {
  cta?: React.ReactNode;
};

export function OrderSummary({ cta }: OrderSummaryProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">Order Summary</h2>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between gap-4 text-slate-600">
          <dt>Subtotal</dt>
          <dd className="font-semibold text-slate-900">{formatMoney(cartSubtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-slate-600">
          <dt>Delivery Charge</dt>
          <dd className="font-semibold text-slate-900">{formatMoney(deliveryCharge)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-slate-600">
          <dt>Discount</dt>
          <dd className="font-semibold text-emerald-700">-{formatMoney(cartDiscount)}</dd>
        </div>
        <div className="border-t border-slate-200 pt-3">
          <div className="flex justify-between gap-4 text-base font-bold text-slate-950">
            <dt>Total</dt>
            <dd>{formatMoney(cartTotal)}</dd>
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
