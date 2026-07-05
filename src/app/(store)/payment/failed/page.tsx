import Link from "next/link";
import { retryPaymentAction } from "@/app/actions";
import { CloseIcon } from "@/components/ui/icons";

type PaymentFailedPageProps = {
  searchParams?: {
    order?: string | string[];
    status?: string | string[];
    reason?: string | string[];
  };
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function readableStatus(value: string | undefined) {
  if (!value) {
    return "failed";
  }

  return value.replace(/-/g, " ");
}

export default function PaymentFailedPage({ searchParams }: PaymentFailedPageProps) {
  const orderNumber = firstParam(searchParams?.order);
  const status = firstParam(searchParams?.status);
  const reason = firstParam(searchParams?.reason) ?? "Gateway timeout or cancelled payment. Please try again or contact Kena Sathi support.";
  const title = status === "cancelled" ? "Payment Cancelled" : "Payment Failed";

  return (
    <section className="py-12">
      <div className="container-page">
        <div className="mx-auto max-w-xl rounded-lg border border-rose-200 bg-white p-6 text-center shadow-sm">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-rose-50 text-rose-700">
            <CloseIcon className="h-8 w-8" />
          </span>
          <h1 className="mt-5 text-3xl font-bold text-slate-950">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            The gateway did not confirm a completed payment. No money was marked as received unless server-side validation succeeds.
          </p>
          <dl className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 text-left text-sm text-slate-600">
            {orderNumber ? (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Order ID</dt>
                <dd className="font-bold text-slate-950">{orderNumber}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Payment Status</dt>
              <dd className="font-bold text-rose-700">{readableStatus(status)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Reason</dt>
              <dd className="mt-1 font-semibold text-slate-700">{reason}</dd>
            </div>
          </dl>
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
              Kena Sathi Support
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