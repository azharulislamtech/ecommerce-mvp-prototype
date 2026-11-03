import Link from "next/link";
import { retryPaymentAction } from "@/app/actions";
import { CloseIcon } from "@/components/ui/icons";
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from "@/lib/order-copy";

type PaymentFailedPageProps = {
  searchParams?: Promise<{
    order?: string | string[];
    status?: string | string[];
    reason?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function readableStatus(value: string | undefined) {
  if (!value) {
    return "ব্যর্থ";
  }

  return value.replace(/-/g, " ");
}

export default async function PaymentFailedPage({ searchParams }: PaymentFailedPageProps) {
  const resolvedSearchParams = await searchParams;
  const orderNumber = firstParam(resolvedSearchParams?.order);
  const status = firstParam(resolvedSearchParams?.status);
  const reason = firstParam(resolvedSearchParams?.reason) ?? "পেমেন্ট সম্পন্ন হয়নি বা বাতিল হয়েছে। আবার চেষ্টা করুন, অথবা আমাদের ফোন করুন।";
  const title = status === "cancelled" ? "পেমেন্ট বাতিল হয়েছে" : "পেমেন্ট সম্পন্ন হয়নি";

  return (
    <section className="py-12">
      <div className="container-page">
        <div className="mx-auto max-w-xl rounded-lg border border-rose-200 bg-white p-6 text-center shadow-sm">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-rose-50 text-rose-700">
            <CloseIcon className="h-8 w-8" />
          </span>
          <h1 className="mt-5 text-3xl font-bold text-slate-950">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            পেমেন্ট সম্পন্ন হয়েছে বলে নিশ্চিত হওয়া যায়নি। আমাদের সার্ভার যাচাই না করা পর্যন্ত কোনো টাকা গ্রহণ হিসেবে ধরা হয় না।
          </p>
          <dl className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 text-left text-sm text-slate-600">
            {orderNumber ? (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">অর্ডার নম্বর</dt>
                <dd className="font-bold text-slate-950">{orderNumber}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">পেমেন্টের অবস্থা</dt>
              <dd className="font-bold text-rose-700">{readableStatus(status)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">কারণ</dt>
              <dd className="mt-1 font-semibold text-slate-700">{reason}</dd>
            </div>
          </dl>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <form action={retryPaymentAction}>
              <button className="focus-ring min-h-12 w-full rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-blue-700">
                আবার চেষ্টা করুন
              </button>
            </form>
            <a
              className="focus-ring inline-flex min-h-12 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-950 hover:bg-slate-50"
              href={SUPPORT_PHONE_TEL}
            >
              ফোন করুন: {SUPPORT_PHONE_DISPLAY}
            </a>
            <Link
              className="focus-ring inline-flex min-h-12 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-950 hover:bg-slate-50"
              href="/products"
            >
              পণ্যে ফিরে যান
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}