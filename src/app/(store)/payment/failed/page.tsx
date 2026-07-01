import Link from "next/link";
import { retryPaymentAction } from "@/app/actions";
import { CloseIcon } from "@/components/ui/icons";

export default function PaymentFailedPage() {
  return (
    <section className="py-12">
      <div className="container-page">
        <div className="mx-auto max-w-xl rounded-lg border border-rose-200 bg-white p-6 text-center shadow-sm">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-rose-50 text-rose-700">
            <CloseIcon className="h-8 w-8" />
          </span>
          <h1 className="mt-5 text-3xl font-bold text-slate-950">Payment Failed</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            The payment gateway did not confirm this payment. No money was marked as received.
          </p>
          <div className="mt-5 rounded-lg bg-slate-50 p-4 text-left text-sm text-slate-600">
            Reason: Gateway timeout or cancelled payment. Please try again or contact support.
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <form action={retryPaymentAction}>
              <button className="focus-ring min-h-12 w-full rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-blue-700">
                Try Again
              </button>
            </form>
            <a
              className="focus-ring inline-flex min-h-12 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-950 hover:bg-slate-50"
              href="tel:01700000000"
            >
              Contact Support
            </a>
            <Link
              className="focus-ring inline-flex min-h-12 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-950 hover:bg-slate-50"
              href="/products"
            >
              Back to Products
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
