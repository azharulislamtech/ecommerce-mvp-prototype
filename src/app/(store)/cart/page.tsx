import Link from "next/link";
import { TrashIcon } from "@/components/ui/icons";
import { OrderSummary } from "@/components/modules/order-summary";
import { ProductVisual } from "@/components/modules/product-visual";
import { cartItems, formatMoney } from "@/lib/data";

export default function CartPage() {
  return (
    <section className="py-8 md:py-10">
      <div className="container-page">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-blue-700">Cart</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Review Your Items</h1>
          </div>
          <Link className="text-sm font-semibold text-blue-700 hover:text-blue-900" href="/products">
            Continue shopping
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {cartItems.map((item) => (
              <article
                className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[128px_1fr_auto]"
                key={item.product.id}
              >
                <ProductVisual label={item.product.name} visual={item.product.visual} />
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-950">{item.product.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">{item.product.shortDescription}</p>
                  <p className="mt-3 text-sm font-semibold text-slate-950">{formatMoney(item.product.price)}</p>
                  <div className="mt-4 flex h-11 w-36 items-center justify-between rounded-md border border-slate-200 px-2">
                    <button className="grid h-8 w-8 place-items-center rounded-md text-lg font-bold text-slate-700 hover:bg-slate-100">
                      -
                    </button>
                    <span className="text-sm font-bold">{item.quantity}</span>
                    <button className="grid h-8 w-8 place-items-center rounded-md text-lg font-bold text-slate-700 hover:bg-slate-100">
                      +
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                  <p className="text-base font-bold text-slate-950">
                    {formatMoney(item.product.price * item.quantity)}
                  </p>
                  <button
                    aria-label={`Remove ${item.product.name}`}
                    className="mt-0 grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 sm:ml-auto sm:mt-4"
                    title="Remove"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <OrderSummary
              cta={
                <Link
                  className="focus-ring inline-flex min-h-12 w-full items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
                  href="/checkout"
                >
                  Proceed to Checkout
                </Link>
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}
