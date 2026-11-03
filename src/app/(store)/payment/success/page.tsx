import Link from "next/link";
import { ClearCartOnSuccess } from "@/components/cart/clear-cart-on-success";
import { SaveRecentOrder } from "@/components/orders/save-recent-order";
import { CheckIcon } from "@/components/ui/icons";
import { formatMoney } from "@/lib/data";
import { SUPPORT_PHONE_DISPLAY, orderStatusLabel, paymentStatusLabel } from "@/lib/order-copy";
import { getOrderSuccessSummary } from "@/lib/supabase/orders";

type PaymentSuccessPageProps = {
  searchParams?: Promise<{
    t?: string | string[];
    status?: string | string[];
    reason?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PaymentSuccessPage({ searchParams }: PaymentSuccessPageProps) {
  const resolvedSearchParams = await searchParams;
  // Resolved from the random tracking token, never the order number: order
  // numbers used to be sequential, so a number-based lookup here let anyone walk
  // the sequence and read every order's total.
  const trackingToken = firstParam(resolvedSearchParams?.t);
  const gatewayStatus = firstParam(resolvedSearchParams?.status);
  const gatewayReason = firstParam(resolvedSearchParams?.reason);
  const order = trackingToken ? await getOrderSuccessSummary(trackingToken) : null;

  return (
    <section className="py-12">
      <ClearCartOnSuccess enabled={Boolean(order)} />
      {order ? <SaveRecentOrder orderNumber={order.order_number} trackingToken={order.tracking_token} /> : null}
      <div className="container-page">
        <div className="mx-auto max-w-xl rounded-lg border border-emerald-200 bg-white p-6 text-center shadow-sm">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-700">
            <CheckIcon className="h-8 w-8" />
          </span>
          <h1 className="mt-5 text-3xl font-bold text-slate-950">ধন্যবাদ! আপনার অর্ডার পেয়েছি।</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            ডেলিভারি নিশ্চিত করতে কেনা সাথী শিগগিরই আপনাকে ফোন করবে।
          </p>
          {gatewayReason ? (
            <div className="mt-5 rounded-lg bg-blue-50 p-4 text-left text-sm font-semibold text-blue-800">
              পেমেন্টের অবস্থা: {gatewayStatus ?? "received"}। {gatewayReason}
            </div>
          ) : null}
          {order ? (
            <>
              <dl className="mt-6 grid gap-3 rounded-lg bg-slate-50 p-4 text-left text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">অর্ডার নম্বর</dt>
                  <dd className="font-bold text-slate-950">{order.order_number}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">অর্ডারের অবস্থা</dt>
                  <dd className="font-bold text-blue-700">{orderStatusLabel(order.order_status)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">পেমেন্ট</dt>
                  <dd className="font-bold text-amber-700">{paymentStatusLabel(order.payment_status)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">মোট টাকা</dt>
                  <dd className="font-bold text-slate-950">{formatMoney(order.total_amount)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                অর্ডারটা এই ডিভাইসে সংরক্ষিত আছে, তাই অর্ডার নম্বর ছাড়াই “অর্ডার ট্র্যাক করুন” পেজ থেকে আবার দেখতে পারবেন।
              </p>
            </>
          ) : (
            <div className="mt-6 rounded-lg bg-amber-50 p-4 text-left text-sm font-semibold text-amber-800">
              অর্ডারের সারাংশ এখন দেখানো যাচ্ছে না। অর্ডার নম্বরটা রেখে দিন, অথবা আমাদের ফোন করুন: {SUPPORT_PHONE_DISPLAY}।
            </div>
          )}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              className="focus-ring inline-flex min-h-12 items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-blue-700"
              href="/products"
            >
              আরও কেনাকাটা করুন
            </Link>
            <Link
              className="focus-ring inline-flex min-h-12 items-center justify-center rounded-md border border-slate-300 px-5 text-sm font-semibold text-slate-950 hover:bg-slate-50"
              href={order ? `/track-order?t=${encodeURIComponent(order.tracking_token)}` : "/track-order"}
            >
              অর্ডার ট্র্যাক করুন
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
