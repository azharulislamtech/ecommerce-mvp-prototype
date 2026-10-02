import { notFound } from "next/navigation";
import { reconcileCancelledStockAction, updateOrderStatusAction } from "@/app/actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney } from "@/lib/data";
import { getAdminOrderDetails } from "@/lib/supabase/orders";

type OrderDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string | string[];
    notice?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default async function OrderDetailsPage({ params, searchParams }: OrderDetailsPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const order = await getAdminOrderDetails(decodeURIComponent(resolvedParams.id));
  const notice = firstParam(resolvedSearchParams?.notice);
  const error = firstParam(resolvedSearchParams?.error);

  if (!order) {
    notFound();
  }

  const latestPayment = order.payments[0];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-blue-700">Orders</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Order {order.order_number}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={order.payment_status === "paid" ? "green" : order.payment_status === "failed" ? "red" : "amber"}>
            {order.payment_status}
          </StatusBadge>
          <StatusBadge tone={order.order_status === "cancelled" ? "red" : "blue"}>
            {order.order_status}
          </StatusBadge>
        </div>
      </div>

      {notice ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Customer Info</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Name</dt>
                <dd className="mt-1 font-semibold text-slate-950">{order.customer_name}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="mt-1 font-semibold text-slate-950">{order.customer_phone}</dd>
              </div>
              <div>
                <dt className="text-slate-500">District</dt>
                <dd className="mt-1 font-semibold text-slate-950">{order.customer_district}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Created</dt>
                <dd className="mt-1 font-semibold text-slate-950">{formatDate(order.created_at)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Delivery Address</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{order.customer_address}</p>
            {order.customer_note ? (
              <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                Note: {order.customer_note}
              </p>
            ) : null}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Ordered Items</h2>
            <div className="mt-4 space-y-3">
              {order.items.map((item) => (
                <article className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-slate-200 p-3" key={item.id}>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-slate-950">{item.product_name}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatMoney(item.unit_price)} x {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-950">{formatMoney(item.total_price)}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Payment Info</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Gateway</dt>
                <dd className="font-semibold text-slate-950">{latestPayment?.gateway_name ?? "pending"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Method</dt>
                <dd className="font-semibold text-slate-950">{latestPayment?.payment_method ?? "pending"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Subtotal</dt>
                <dd className="font-semibold text-slate-950">{formatMoney(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Delivery</dt>
                <dd className="font-semibold text-slate-950">{formatMoney(order.delivery_charge)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-slate-200 pt-3">
                <dt className="font-bold text-slate-950">Amount</dt>
                <dd className="font-bold text-slate-950">{formatMoney(order.total_amount)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Order Status Update</h2>
            <form action={updateOrderStatusAction}>
              <input name="order_number" type="hidden" value={order.order_number} />
              <label className="mt-4 block">
                <span className="text-sm font-semibold text-slate-950">Order status</span>
                <select className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" defaultValue={order.order_status} name="order_status">
                  <option>pending</option>
                  <option>confirmed</option>
                  <option>processing</option>
                  <option>shipped</option>
                  <option>delivered</option>
                  <option>cancelled</option>
                </select>
              </label>
              <label className="mt-4 block">
                <span className="text-sm font-semibold text-slate-950">Payment status</span>
                <select className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" defaultValue={order.payment_status} name="payment_status">
                  <option>pending</option>
                  <option>paid</option>
                  <option>failed</option>
                  <option>cancelled</option>
                  <option>refunded</option>
                </select>
              </label>
              <button className="focus-ring mt-5 min-h-12 w-full rounded-md bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-blue-700">
                Save Update
              </button>
            </form>
          </section>
          {order.order_status === "cancelled" && order.stock_released !== true && (
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-bold text-slate-950">Confirm returned inventory</h2>
              <p className="mt-2 text-sm text-slate-700">Stock stays reserved until all items are physically received and sellable. Confirm existing stock counts before continuing.</p>
              <form action={reconcileCancelledStockAction} className="mt-4 space-y-4">
                <input name="order_number" type="hidden" value={order.order_number} />
                <label className="block text-sm">
                  Inventory state
                  <select name="inventory_state" required defaultValue="" className="focus-ring mt-2 w-full rounded border border-slate-300 bg-white p-3">
                    <option value="" disabled>Choose after checking the goods</option>
                    <option value="returned">Received and sellable; add items back to stock</option>
                    <option value="already-restocked">Already included in stock; confirm without adding</option>
                  </select>
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <input name="receipt_confirmed" value="yes" type="checkbox" required className="mt-1" />
                  I checked all returned items and the inventory count is correct.
                </label>
                <button className="focus-ring rounded bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Confirm inventory</button>
              </form>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
