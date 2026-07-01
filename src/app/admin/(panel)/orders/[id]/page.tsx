import { notFound } from "next/navigation";
import { ProductVisual } from "@/components/modules/product-visual";
import { StatusBadge } from "@/components/ui/status-badge";
import { cartItems, formatMoney, getOrderById, orders } from "@/lib/data";

type OrderDetailsPageProps = {
  params: {
    id: string;
  };
};

export function generateStaticParams() {
  return orders.map((order) => ({ id: order.id }));
}

export default function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  const order = getOrderById(params.id);

  if (!order) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-blue-700">Orders</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Order {order.id}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={order.paymentStatus === "paid" ? "green" : order.paymentStatus === "failed" ? "red" : "amber"}>
            {order.paymentStatus}
          </StatusBadge>
          <StatusBadge tone={order.orderStatus === "cancelled" ? "red" : "blue"}>
            {order.orderStatus}
          </StatusBadge>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Customer Info</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Name</dt>
                <dd className="mt-1 font-semibold text-slate-950">{order.customer}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="mt-1 font-semibold text-slate-950">{order.phone}</dd>
              </div>
              <div>
                <dt className="text-slate-500">District</dt>
                <dd className="mt-1 font-semibold text-slate-950">Dhaka</dd>
              </div>
              <div>
                <dt className="text-slate-500">Created</dt>
                <dd className="mt-1 font-semibold text-slate-950">{order.createdAt}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Delivery Address</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              House 18, Road 7, Dhanmondi, Dhaka. Call before delivery.
            </p>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Ordered Items</h2>
            <div className="mt-4 space-y-3">
              {cartItems.map((item) => (
                <article className="grid grid-cols-[76px_1fr_auto] items-center gap-3 rounded-md border border-slate-200 p-3" key={item.product.id}>
                  <ProductVisual compact label={item.product.name} visual={item.product.visual} />
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-slate-950">{item.product.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatMoney(item.product.price)} x {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-950">
                    {formatMoney(item.product.price * item.quantity)}
                  </p>
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
                <dd className="font-semibold text-slate-950">Placeholder Gateway</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Transaction</dt>
                <dd className="font-semibold text-slate-950">TXN-88A91</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Amount</dt>
                <dd className="font-bold text-slate-950">{formatMoney(order.total)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Order Status Update</h2>
            <label className="mt-4 block">
              <span className="text-sm font-semibold text-slate-950">Order status</span>
              <select className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" defaultValue={order.orderStatus}>
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
              <select className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" defaultValue={order.paymentStatus}>
                <option>pending</option>
                <option>paid</option>
                <option>failed</option>
                <option>cancelled</option>
                <option>refunded</option>
              </select>
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-semibold text-slate-950">Admin Note</span>
              <textarea className="focus-ring mt-2 min-h-24 w-full rounded-md border border-slate-200 px-3 py-3 text-sm" placeholder="Add internal note" />
            </label>
            <button className="focus-ring mt-5 min-h-12 w-full rounded-md bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-blue-700">
              Save Update
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
