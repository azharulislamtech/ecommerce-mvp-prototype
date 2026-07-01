import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney, orders } from "@/lib/data";

export default function AdminOrderListPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase text-blue-700">Orders</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Order Management</h1>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_190px_190px]">
          <input
            className="focus-ring h-11 rounded-md border border-slate-200 px-3 text-sm"
            placeholder="Search order or phone"
            type="search"
          />
          <select className="focus-ring h-11 rounded-md border border-slate-200 bg-white px-3 text-sm">
            <option>Payment status</option>
            <option>paid</option>
            <option>pending</option>
            <option>failed</option>
          </select>
          <select className="focus-ring h-11 rounded-md border border-slate-200 bg-white px-3 text-sm">
            <option>Order status</option>
            <option>pending</option>
            <option>confirmed</option>
            <option>processing</option>
            <option>shipped</option>
          </select>
        </div>
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
                  <td className="py-3 pr-4 font-bold text-slate-950">{order.id}</td>
                  <td className="py-3 pr-4 text-slate-700">{order.customer}</td>
                  <td className="py-3 pr-4 text-slate-700">{order.phone}</td>
                  <td className="py-3 pr-4 font-semibold text-slate-950">{formatMoney(order.total)}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge tone={order.paymentStatus === "paid" ? "green" : order.paymentStatus === "failed" ? "red" : "amber"}>
                      {order.paymentStatus}
                    </StatusBadge>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge tone={order.orderStatus === "cancelled" ? "red" : "blue"}>
                      {order.orderStatus}
                    </StatusBadge>
                  </td>
                  <td className="py-3 pr-4 text-slate-700">{order.createdAt}</td>
                  <td className="py-3">
                    <Link
                      className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      href={`/admin/orders/${order.id}`}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
