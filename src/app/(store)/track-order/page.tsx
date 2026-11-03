import { RecentOrdersPanel } from "@/components/orders/recent-orders-panel";
import { SaveRecentOrder } from "@/components/orders/save-recent-order";
import { formatMoney } from "@/lib/data";
import { SUPPORT_PHONE_DISPLAY, formatBanglaDate, orderStatusLabel, paymentStatusLabel } from "@/lib/order-copy";
import { RATE_LIMIT_WINDOW_MINUTES } from "@/lib/rate-limit";
import type { OrderStatus } from "@/lib/supabase/database.types";
import { trackOrderByNumberAndPhone, trackOrderByToken, type TrackOrderResult } from "@/lib/supabase/orders";

export const dynamic = "force-dynamic";

type TrackOrderPageProps = {
  searchParams?: Promise<{
    order?: string | string[];
    orderId?: string | string[];
    phone?: string | string[];
    t?: string | string[];
  }>;
};

const orderSteps: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: orderStatusLabel("pending") },
  { status: "confirmed", label: orderStatusLabel("confirmed") },
  { status: "processing", label: orderStatusLabel("processing") },
  { status: "shipped", label: orderStatusLabel("shipped") },
  { status: "delivered", label: orderStatusLabel("delivered") }
];

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string) {
  return formatBanglaDate(value) ?? "";
}

function statusTone(status: OrderStatus) {
  if (status === "delivered") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "cancelled") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
}

function emptyStateCopy(result: TrackOrderResult | null) {
  if (result?.status === "rate-limited") {
    return {
      heading: "অনেকবার চেষ্টা হয়েছে",
      body: `এই সংযোগ থেকে অনেকবার ভুল তথ্য দিয়ে খোঁজা হয়েছে। ${RATE_LIMIT_WINDOW_MINUTES} মিনিট পরে আবার চেষ্টা করুন, অথবা আমাদের ফোন করুন: ${SUPPORT_PHONE_DISPLAY}।`
    };
  }

  if (result?.status === "not-found") {
    return {
      heading: "অর্ডার পাওয়া যায়নি",
      body: "এই অর্ডার নম্বর আর মোবাইল নম্বর মেলেনি। দুটোই দেখে আবার চেষ্টা করুন।"
    };
  }

  return {
    heading: "অর্ডারের তথ্য দিন",
    body: "অর্ডার নম্বর আর চেকআউটে দেওয়া মোবাইল নম্বর দিলে অর্ডারের সর্বশেষ অবস্থা দেখতে পাবেন।"
  };
}

export default async function TrackOrderPage({ searchParams }: TrackOrderPageProps) {
  const resolvedSearchParams = await searchParams;
  const tokenQuery = firstParam(resolvedSearchParams?.t) ?? "";
  const orderQuery = firstParam(resolvedSearchParams?.order) ?? firstParam(resolvedSearchParams?.orderId) ?? "";
  const phoneQuery = firstParam(resolvedSearchParams?.phone) ?? "";

  let result: TrackOrderResult | null = null;

  if (tokenQuery) {
    result = await trackOrderByToken(tokenQuery);
  } else if (orderQuery && phoneQuery) {
    result = await trackOrderByNumberAndPhone(orderQuery, phoneQuery);
  }

  const trackedOrder = result?.status === "found" ? result.order : null;
  const currentStepIndex = trackedOrder ? orderSteps.findIndex((step) => step.status === trackedOrder.order_status) : -1;
  const isCancelled = trackedOrder?.order_status === "cancelled";
  const emptyState = emptyStateCopy(result);

  return (
    <section className="py-8 md:py-10">
      {/* Tracking on a new device teaches that device the order, so the next visit is one tap. */}
      {trackedOrder ? (
        <SaveRecentOrder orderNumber={trackedOrder.order_number} trackingToken={trackedOrder.tracking_token} />
      ) : null}
      <div className="container-page grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm font-semibold text-blue-700">অর্ডার ট্র্যাকিং</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">আপনার অর্ডার কোথায় আছে দেখুন</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            চেকআউটে দেওয়া অর্ডার নম্বর আর মোবাইল নম্বর দিয়ে অর্ডারের অবস্থা দেখুন।
          </p>
          <form className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" method="get">
            <label className="block">
              <span className="text-sm font-semibold text-slate-950">অর্ডার নম্বর</span>
              <input
                className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
                defaultValue={orderQuery}
                name="order"
                placeholder="SP-20260704-K7M2QX"
                required
              />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-semibold text-slate-950">মোবাইল নম্বর</span>
              <input
                className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
                defaultValue={phoneQuery}
                name="phone"
                placeholder="017XXXXXXXX"
                required
                type="tel"
              />
            </label>
            <button className="focus-ring mt-5 min-h-12 w-full rounded-md bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-blue-700">
              অর্ডার খুঁজুন
            </button>
          </form>
          <RecentOrdersPanel activeToken={trackedOrder?.tracking_token} />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          {trackedOrder ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-700">বর্তমান অবস্থা</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-950">অর্ডার {trackedOrder.order_number}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    পেমেন্ট: {paymentStatusLabel(trackedOrder.payment_status)}। অর্ডার: {orderStatusLabel(trackedOrder.order_status)}।
                  </p>
                </div>
                <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-sm font-bold ${statusTone(trackedOrder.order_status)}`}>
                  {orderStatusLabel(trackedOrder.order_status)}
                </span>
              </div>

              {isCancelled ? (
                <div className="mt-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                  অর্ডারটা বাতিল হয়েছে। সাহায্য লাগলে ফোন করুন: {SUPPORT_PHONE_DISPLAY}।
                </div>
              ) : null}

              <ol className="mt-6 space-y-4">
                {orderSteps.map((step, index) => {
                  const active = !isCancelled && index <= currentStepIndex;
                  const current = !isCancelled && index === currentStepIndex;

                  return (
                    <li className="flex gap-3" key={step.status}>
                      <span
                        className={`mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                          active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="font-bold text-slate-950">{step.label}</h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {current ? "অর্ডার এখন এই ধাপে আছে।" : active ? "এই ধাপ শেষ হয়েছে।" : "এখনো এই ধাপে পৌঁছায়নি।"}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <dl className="mt-6 grid gap-3 rounded-md bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">পেমেন্ট</dt>
                  <dd className="mt-1 font-bold text-slate-950">{paymentStatusLabel(trackedOrder.payment_status)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">জেলা</dt>
                  <dd className="mt-1 font-bold text-slate-950">{trackedOrder.customer_district}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">অর্ডারের সময়</dt>
                  <dd className="mt-1 font-bold text-slate-950">{formatDate(trackedOrder.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">সর্বশেষ আপডেট</dt>
                  <dd className="mt-1 font-bold text-slate-950">{formatDate(trackedOrder.updated_at)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">মোট টাকা</dt>
                  <dd className="mt-1 font-bold text-slate-950">{formatMoney(trackedOrder.total_amount)}</dd>
                </div>
              </dl>

              {trackedOrder.items.length ? (
                <div className="mt-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-950">পণ্য</h3>
                  {trackedOrder.items.map((item) => (
                    <article className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-slate-200 p-3" key={item.id}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-950">{item.product_name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatMoney(item.unit_price)} × {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-slate-950">{formatMoney(item.total_price)}</p>
                    </article>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex min-h-[360px] flex-col justify-center rounded-md bg-slate-50 p-6 text-center">
              <p className="text-sm font-semibold text-blue-700">অর্ডার খোঁজা</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">{emptyState.heading}</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">{emptyState.body}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
