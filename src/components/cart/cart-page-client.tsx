"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { OrderSummary } from "@/components/modules/order-summary";
import { ProductVisual } from "@/components/modules/product-visual";
import { TrashIcon } from "@/components/ui/icons";
import { CART_DISCOUNT, DELIVERY_CHARGE, clampCartQuantity } from "@/lib/cart";
import { formatMoney, type Product } from "@/lib/data";

type CartPageClientProps = {
  products: Product[];
};

export function CartPageClient({ products }: CartPageClientProps) {
  const { hydrated, items, removeItem, setItemQuantity } = useCart();
  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const availableItems = items
    .map((item) => ({ ...item, product: productsById.get(item.productId) }))
    .filter((item): item is typeof item & { product: Product } => Boolean(item.product));
  const unavailableItems = items.filter((item) => !productsById.has(item.productId));
  const itemCount = availableItems.reduce((total, item) => total + item.quantity, 0);
  const subtotal = availableItems.reduce((total, item) => total + item.product.price * item.quantity, 0);

  if (!hydrated) {
    return (
      <section className="py-8 md:py-10">
        <div className="container-page">
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600 shadow-sm">
            কার্ট লোড হচ্ছে...
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 md:py-10">
      <div className="container-page">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-700">কার্ট</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">আপনার পণ্যগুলো দেখে নিন</h1>
          </div>
          <Link className="text-sm font-semibold text-blue-700 hover:text-blue-900" href="/products">
            আরও কেনাকাটা করুন
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">আপনার কার্ট খালি</h2>
            <p className="mt-2 text-sm text-slate-600">চেকআউটের আগে পণ্য যোগ করুন।</p>
            <Link
              className="focus-ring mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-blue-700"
              href="/products"
            >
              পণ্য দেখুন
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              {unavailableItems.length ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  কার্টের {unavailableItems.length}টি পণ্য এখন পাওয়া যাচ্ছে না। চেকআউটের আগে সেগুলো সরিয়ে দিন।
                </div>
              ) : null}

              {availableItems.map((item) => (
                <article
                  className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[128px_1fr_auto]"
                  data-product-id={item.product.id}
                  data-testid="cart-line"
                  key={item.product.id}
                >
                  <ProductVisual
                    imageAlt={item.product.imageAlt}
                    imageUrl={item.product.imageUrl}
                    label={item.product.name}
                    visual={item.product.visual}
                  />
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-950">{item.product.name}</h2>
                    <p className="mt-1 text-sm text-slate-600">{item.product.shortDescription}</p>
                    <p className="mt-3 text-sm font-semibold text-slate-950">{formatMoney(item.product.price)}</p>
                    <div className="mt-4 flex h-11 w-36 items-center justify-between rounded-md border border-slate-200 px-2">
                      <button
                        className="grid h-8 w-8 place-items-center rounded-md text-lg font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
                        disabled={item.quantity <= 1}
                        aria-label="পরিমাণ কমান"
                        onClick={() => setItemQuantity(item.product.id, item.quantity - 1, item.product.stock)}
                        type="button"
                      >
                        -
                      </button>
                      <input
                        aria-label={`${item.product.name}-এর পরিমাণ`}
                        className="w-12 border-0 bg-transparent text-center text-sm font-bold outline-none"
                        min="1"
                        max={Math.max(1, item.product.stock)}
                        onChange={(event) =>
                          setItemQuantity(
                            item.product.id,
                            clampCartQuantity(Number(event.target.value), item.product.stock),
                            item.product.stock
                          )
                        }
                        type="number"
                        value={item.quantity}
                      />
                      <button
                        className="grid h-8 w-8 place-items-center rounded-md text-lg font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
                        disabled={item.quantity >= item.product.stock}
                        aria-label="পরিমাণ বাড়ান"
                        onClick={() => setItemQuantity(item.product.id, item.quantity + 1, item.product.stock)}
                        type="button"
                      >
                        +
                      </button>
                    </div>
                    {item.quantity >= item.product.stock ? (
                      <p className="mt-2 text-xs font-semibold text-amber-700">স্টকে আছে মাত্র {item.product.stock}টি।</p>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                    <p className="text-base font-bold text-slate-950">
                      {formatMoney(item.product.price * item.quantity)}
                    </p>
                    <button
                      aria-label={`${item.product.name} কার্ট থেকে সরান`}
                      className="mt-0 grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 sm:ml-auto sm:mt-4"
                      onClick={() => removeItem(item.product.id)}
                      title="সরান"
                      type="button"
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
                    className={`focus-ring inline-flex min-h-12 w-full items-center justify-center rounded-md px-5 text-sm font-semibold transition ${
                      availableItems.length && !unavailableItems.length
                        ? "bg-slate-950 text-white hover:bg-blue-700"
                        : "pointer-events-none bg-slate-300 text-white"
                    }`}
                    data-testid="cart-checkout-link"
                    href="/checkout"
                  >
                    চেকআউটে যান
                  </Link>
                }
                deliveryCharge={DELIVERY_CHARGE}
                discount={CART_DISCOUNT}
                itemCount={itemCount}
                subtotal={subtotal}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
