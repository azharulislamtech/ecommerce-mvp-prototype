import { RecentOrdersPanel } from "@/components/orders/recent-orders-panel";
import { SaveRecentOrder } from "@/components/orders/save-recent-order";
import { formatMoney } from "@/lib/data";
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
  { status: "pending", label: "Pending" },
  { status: "confirmed", label: "Confirmed" },
  { status: "processing", label: "Processing" },
  { status: "shipped", label: "Shipped" },
  { status: "delivered", label: "Delivered" }
];

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatStatus(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
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
      heading: "Too Many Attempts",
      body: `Too many order lookups failed from this connection. Please wait ${RATE_LIMIT_WINDOW_MINUTES} minutes and try again, or call Kena Sathi support.`
    };
  }

  if (result?.status === "not-found") {
    return {
      heading: "Order Not Found",
      body: "We could not match that order ID and phone number. Please check both values and try again."
    };
  }

  return {
    heading: "Enter Order Details",
    body: "Submit your order ID and checkout phone number to see the latest admin-updated delivery status."
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
          <p className="text-sm font-semibold uppercase text-blue-700">Order Tracking</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Track Your Order</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Customers can check live order progress with the order ID and phone number used at checkout.
          </p>
          <form className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" method="get">
            <label className="block">
              <span className="text-sm font-semibold text-slate-950">Order ID</span>
              <input
                className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
                defaultValue={orderQuery}
                name="order"
                placeholder="SP-20260704-K7M2QX"
                required
              />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-semibold text-slate-950">Phone Number</span>
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
              Track Order
            </button>
          </form>
          <RecentOrdersPanel activeToken={trackedOrder?.tracking_token} />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          {trackedOrder ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase text-blue-700">Live Status</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-950">Order {trackedOrder.order_number}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Payment {formatStatus(trackedOrder.payment_status)}, order {formatStatus(trackedOrder.order_status)}.
                  </p>
                </div>
                <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-sm font-bold ${statusTone(trackedOrder.order_status)}`}>
                  {formatStatus(trackedOrder.order_status)}
                </span>
              </div>

              {isCancelled ? (
                <div className="mt-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                  This order is cancelled. Contact support if you need help with this order.
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
                          {current ? "Current order status." : active ? "This step is complete." : "Waiting for admin update."}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <dl className="mt-6 grid gap-3 rounded-md bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Payment Status</dt>
                  <dd className="mt-1 font-bold text-slate-950">{formatStatus(trackedOrder.payment_status)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">District</dt>
                  <dd className="mt-1 font-bold text-slate-950">{trackedOrder.customer_district}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Created</dt>
                  <dd className="mt-1 font-bold text-slate-950">{formatDate(trackedOrder.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Last Updated</dt>
                  <dd className="mt-1 font-bold text-slate-950">{formatDate(trackedOrder.updated_at)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">Total Amount</dt>
                  <dd className="mt-1 font-bold text-slate-950">{formatMoney(trackedOrder.total_amount)}</dd>
                </div>
              </dl>

              {trackedOrder.items.length ? (
                <div className="mt-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-950">Items</h3>
                  {trackedOrder.items.map((item) => (
                    <article className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-slate-200 p-3" key={item.id}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-950">{item.product_name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatMoney(item.unit_price)} x {item.quantity}
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
              <p className="text-sm font-semibold uppercase text-blue-700">Live Order Lookup</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">{emptyState.heading}</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">{emptyState.body}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
