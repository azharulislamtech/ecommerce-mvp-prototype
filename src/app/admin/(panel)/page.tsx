import Link from "next/link";
import { ProductVisual } from "@/components/modules/product-visual";
import { StatusBadge } from "@/components/ui/status-badge";
import { dashboardStats, formatMoney, orders, products } from "@/lib/data";

export default function AdminDashboardPage() {
  const lowStock = products.filter((product) => product.stock <= 8);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-blue-700">Dashboard</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Store Overview</h1>
        </div>
        <Link
          className="focus-ring inline-flex min-h-11 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          href="/admin/products/new"
        >
          Add Product
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {dashboardStats.map((stat) => (
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={stat.label}>
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="mt-3 text-2xl font-bold text-slate-950">{stat.value}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-950">Recent Orders</h2>
            <Link className="text-sm font-semibold text-blue-700 hover:text-blue-900" href="/admin/orders">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="py-3 pr-4 font-semibold">Order ID</th>
                  <th className="py-3 pr-4 font-semibold">Customer</th>
                  <th className="py-3 pr-4 font-semibold">Total</th>
                  <th className="py-3 pr-4 font-semibold">Payment</th>
                  <th className="py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 4).map((order) => (
                  <tr className="border-b border-slate-100 last:border-0" key={order.id}>
                    <td className="py-3 pr-4 font-bold text-slate-950">{order.id}</td>
                    <td className="py-3 pr-4 text-slate-700">{order.customer}</td>
                    <td className="py-3 pr-4 font-semibold text-slate-950">{formatMoney(order.total)}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge tone={order.paymentStatus === "paid" ? "green" : order.paymentStatus === "failed" ? "red" : "amber"}>
                        {order.paymentStatus}
                      </StatusBadge>
                    </td>
                    <td className="py-3">
                      <StatusBadge tone={order.orderStatus === "cancelled" ? "red" : "blue"}>
                        {order.orderStatus}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Low Stock Products</h2>
          <div className="mt-4 space-y-4">
            {lowStock.map((product) => (
              <Link
                className="grid grid-cols-[76px_1fr_auto] items-center gap-3 rounded-md border border-slate-200 p-3 hover:bg-slate-50"
                href={`/admin/products/${product.id}/edit`}
                key={product.id}
              >
                <ProductVisual compact label={product.name} visual={product.visual} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-950">{product.name}</p>
                  <p className="text-xs text-slate-500">{product.category}</p>
                </div>
                <span className="text-sm font-bold text-amber-700">{product.stock}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
