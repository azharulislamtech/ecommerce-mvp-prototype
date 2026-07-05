import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney } from "@/lib/data";
import { getAdminOrders } from "@/lib/supabase/orders";

export const dynamic = "force-dynamic";

type AdminOrderListPageProps = {
  searchParams?: {
    orderStatus?: string | string[];
    paymentStatus?: string | string[];
    q?: string | string[];
  };
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

export default async function AdminOrderListPage({ searchParams }: AdminOrderListPageProps) {
  const q = firstParam(searchParams?.q) ?? "";
  const paymentStatus = firstParam(searchParams?.paymentStatus) ?? "";
  const orderStatus = firstParam(searchParams?.orderStatus) ?? "";
  const orders = await getAdminOrders({ orderStatus, paymentStatus, q });

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-blue-700">Orders</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Order Management</h1>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <form className="mb-4 grid gap-3 md:grid-cols-[1fr_190px_190px_auto_auto]">
          <input
            className="focus-ring h-11 rounded-md border border-slate-200 px-3 text-sm"
            defaultValue={q}
            name="q"
            placeholder="Search order or phone"
            type="search"
          />
          <select
            className="focus-ring h-11 rounded-md border border-slate-200 bg-white px-3 text-sm"
            defaultValue={paymentStatus}
            name="paymentStatus"
          >
            <option value="">Payment status</option>
            <option value="paid">paid</option>
            <option value="pending">pending</option>
            <option value="failed">failed</option>
            <option value="cancelled">cancelled</option>
            <option value="refunded">refunded</option>
          </select>
          <select
            className="focus-ring h-11 rounded-md border border-slate-200 bg-white px-3 text-sm"
            defaultValue={orderStatus}
            name="orderStatus"
          >
            <option value="">Order status</option>
            <option value="pending">pending</option>
            <option value="confirmed">confirmed</option>
            <option value="processing">processing</option>
            <option value="shipped">shipped</option>
            <option value="delivered">delivered</option>
            <option value="cancelled">cancelled</option>
          </select>
          <button className="focus-ring min-h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-blue-700">
            Search
          </button>
          <Link
            className="focus-ring inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-950 hover:bg-slate-50"
            href="/admin/orders"
          >
            Reset
          </Link>
        </form>
        <div className="overflow-x-auto">
          <table className="admin-table w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="py-3 pr-4 font-semibold">Order ID</th>
                <th className="py-3 pr-4 font-semibold">Customer</th>
                <th className="py-3 pr-4 font-semibold">Phone</th>
                <th className="py-3 pr-4 font-semibold">Total Amount</th>
                <th className="py-3 pr-4 font-semibold">Payment Status</th>
                <th className="py-3 pr-4 font-semibold">Order Status</th>
                <th className="py-3 pr-4 font-semibold">Created Date</th>
                <th className="py-3 font-semibold">View</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr className="border-b border-slate-100 last:border-0" key={order.id}>
                  <td className="py-3 pr-4 font-bold text-slate-950">{order.order_number}</td>
                  <td className="py-3 pr-4 text-slate-700">{order.customer_name}</td>
                  <td className="py-3 pr-4 text-slate-700">{order.customer_phone}</td>
                  <td className="py-3 pr-4 font-semibold text-slate-950">{formatMoney(order.total_amount)}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge tone={order.payment_status === "paid" ? "green" : order.payment_status === "failed" ? "red" : "amber"}>
                      {order.payment_status}
                    </StatusBadge>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge tone={order.order_status === "cancelled" ? "red" : "blue"}>
                      {order.order_status}
                    </StatusBadge>
                  </td>
                  <td className="py-3 pr-4 text-slate-700">{formatDate(order.created_at)}</td>
                  <td className="py-3">
                    <Link
                      className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      href={`/admin/orders/${order.order_number}`}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {!orders.length ? (
                <tr>
                  <td className="py-8 text-center text-sm font-semibold text-slate-500" colSpan={8}>
                    No orders matched this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
