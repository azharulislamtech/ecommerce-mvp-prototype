import Link from "next/link";
import { CheckIcon } from "@/components/ui/icons";
import { formatMoney } from "@/lib/data";

export default function PaymentSuccessPage() {
  return (
    <section className="py-12">
      <div className="container-page">
        <div className="mx-auto max-w-xl rounded-lg border border-emerald-200 bg-white p-6 text-center shadow-sm">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-700">
            <CheckIcon className="h-8 w-8" />
          </span>
          <h1 className="mt-5 text-3xl font-bold text-slate-950">Thank you! Your order has been confirmed.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            We will contact you soon for delivery confirmation.
          </p>
          <dl className="mt-6 grid gap-3 rounded-lg bg-slate-50 p-4 text-left text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Order ID</dt>
              <dd className="font-bold text-slate-950">SP-1028</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Payment Status</dt>
              <dd className="font-bold text-emerald-700">Paid</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Total Amount</dt>
              <dd className="font-bold text-slate-950">{formatMoney(6150)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Customer Phone</dt>
              <dd className="font-bold text-slate-950">01712000000</dd>
            </div>
          </dl>
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
