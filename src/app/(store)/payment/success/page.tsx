import Link from "next/link";
import { ClearCartOnSuccess } from "@/components/cart/clear-cart-on-success";
import { CheckIcon } from "@/components/ui/icons";
import { formatMoney } from "@/lib/data";
import { getOrderSuccessSummary } from "@/lib/supabase/orders";

type PaymentSuccessPageProps = {
  searchParams?: {
    order?: string | string[];
    status?: string | string[];
    reason?: string | string[];
  };
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PaymentSuccessPage({ searchParams }: PaymentSuccessPageProps) {
  const orderNumber = firstParam(searchParams?.order);
  const gatewayStatus = firstParam(searchParams?.status);
  const gatewayReason = firstParam(searchParams?.reason);
  const order = orderNumber ? await getOrderSuccessSummary(orderNumber) : null;

  return (
    <section className="py-12">
      <ClearCartOnSuccess enabled={Boolean(order)} />
      <div className="container-page">
        <div className="mx-auto max-w-xl rounded-lg border border-emerald-200 bg-white p-6 text-center shadow-sm">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-700">
            <CheckIcon className="h-8 w-8" />
          </span>
          <h1 className="mt-5 text-3xl font-bold text-slate-950">Thank you! Your order has been received.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            We will contact you soon for delivery confirmation.
          </p>
          {gatewayReason ? (
            <div className="mt-5 rounded-lg bg-blue-50 p-4 text-left text-sm font-semibold text-blue-800">
              Gateway status: {gatewayStatus ?? "received"}. {gatewayReason}
            </div>
          ) : null}
          {order ? (
            <dl className="mt-6 grid gap-3 rounded-lg bg-slate-50 p-4 text-left text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Order ID</dt>
                <dd className="font-bold text-slate-950">{order.order_number}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Order Status</dt>
                <dd className="font-bold text-blue-700">{order.order_status}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Payment Status</dt>
                <dd className="font-bold text-amber-700">{order.payment_status}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Total Amount</dt>
                <dd className="font-bold text-slate-950">{formatMoney(order.total_amount)}</dd>
              </div>
            </dl>
          ) : (
            <div className="mt-6 rounded-lg bg-amber-50 p-4 text-left text-sm font-semibold text-amber-800">
              Order summary is unavailable. Please keep your order confirmation from checkout or contact support.
            </div>
          )}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              className="focus-ring inline-flex min-h-12 items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-blue-700"
              href="/products"
            >
              Continue Shopping
            </Link>
            <Link
              className="focus-ring inline-flex min-h-12 items-center justify-center rounded-md border border-slate-300 px-5 text-sm font-semibold text-slate-950 hover:bg-slate-50"
              href="/track-order"
            >
              Track Order
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}