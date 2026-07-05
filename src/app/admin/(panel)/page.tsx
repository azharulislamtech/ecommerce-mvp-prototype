import Link from "next/link";
import { ProductVisual } from "@/components/modules/product-visual";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney } from "@/lib/data";
import type { ProductVisual as ProductVisualType } from "@/lib/data";
import { getAdminDashboardOverview } from "@/lib/supabase/admin-dashboard";
import type { OrderStatus, PaymentStatus } from "@/lib/supabase/database.types";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-BD").format(value);
}

function formatStatus(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function paymentTone(status: PaymentStatus) {
  if (status === "paid") {
    return "green";
  }

  if (status === "failed" || status === "cancelled" || status === "refunded") {
    return "red";
  }

  return "amber";
}

function orderTone(status: OrderStatus) {
  if (status === "delivered") {
    return "green";
  }

  if (status === "cancelled") {
    return "red";
  }

  return "blue";
}

function visualForCategory(slug: string | null): ProductVisualType {
  if (slug === "fashion") {
    return "fashion";
  }

  if (slug === "home-living") {
    return "home";
  }

  if (slug === "beauty") {
    return "beauty";
  }

  if (slug === "accessories") {
    return "accessories";
  }

  return "electronics";
}

export default async function AdminDashboardPage() {
  const overview = await getAdminDashboardOverview();
  const statCards = [
    { label: "Total Orders", value: formatNumber(overview.stats.totalOrders) },
    { label: "Pending Orders", value: formatNumber(overview.stats.pendingOrders) },
    { label: "Paid Orders", value: formatNumber(overview.stats.paidOrders) },
    { label: "Paid Sales", value: formatMoney(overview.stats.paidRevenue) },
    { label: "Total Products", value: formatNumber(overview.stats.totalProducts) }
  ];

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
        {statCards.map((stat) => (
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
          {overview.recentOrders.length ? (
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
                  {overview.recentOrders.map((order) => (
                    <tr className="border-b border-slate-100 last:border-0" key={order.order_number}>
                      <td className="py-3 pr-4 font-bold text-slate-950">
                        <Link className="hover:text-blue-700" href={`/admin/orders/${order.order_number}`}>
                          {order.order_number}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-slate-700">{order.customer_name}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-950">{formatMoney(order.total_amount)}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge tone={paymentTone(order.payment_status)}>{formatStatus(order.payment_status)}</StatusBadge>
                      </td>
                      <td className="py-3">
                        <StatusBadge tone={orderTone(order.order_status)}>{formatStatus(order.order_status)}</StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-md bg-slate-50 p-5 text-sm text-slate-600">
              No orders yet. New checkout orders will appear here automatically.
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Low Stock Products</h2>
          {overview.lowStockProducts.length ? (
            <div className="mt-4 space-y-4">
              {overview.lowStockProducts.map((product) => (
                <Link
                  className="grid grid-cols-[76px_1fr_auto] items-center gap-3 rounded-md border border-slate-200 p-3 hover:bg-slate-50"
                  href={`/admin/products/${product.id}/edit`}
                  key={product.id}
                >
                  <ProductVisual
                    compact
                    imageAlt={product.imageAlt ?? product.name}
                    imageUrl={product.imageUrl ?? undefined}
                    label={product.name}
                    visual={visualForCategory(product.categorySlug)}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.categoryName}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-amber-700">{product.stockQuantity}</span>
                    {!product.isActive ? <p className="mt-1 text-xs font-semibold text-rose-700">Inactive</p> : null}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-md bg-slate-50 p-5 text-sm text-slate-600">
              No low-stock products at the current threshold.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}