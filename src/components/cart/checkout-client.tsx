"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createOrderAction, type CheckoutFormState } from "@/app/actions";
import { useCart } from "@/components/cart/cart-provider";
import { OrderSummary } from "@/components/modules/order-summary";
import { CART_DISCOUNT } from "@/lib/cart";
import {
  DHAKA_DELIVERY_CHARGE,
  OUTSIDE_DHAKA_DELIVERY_CHARGE,
  getDeliveryChargeForDistrict
} from "@/lib/delivery";
import { formatMoney, type Product } from "@/lib/data";

const initialState: CheckoutFormState = {
  status: "idle",
  message: "",
  fieldErrors: {}
};

type CheckoutClientProps = {
  districts: readonly string[];
  onlinePaymentsEnabled: boolean;
  products: Product[];
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="focus-ring mt-6 min-h-12 w-full rounded-md bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? "Creating Order..." : "Place Order"}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-2 text-sm font-semibold text-rose-700">{message}</p> : null;
}

export function CheckoutClient({ districts, onlinePaymentsEnabled, products }: CheckoutClientProps) {
  const { hydrated, items } = useCart();
  const [state, formAction] = useFormState(createOrderAction, initialState);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const availableItems = items
    .map((item) => ({ ...item, product: productsById.get(item.productId) }))
    .filter((item): item is typeof item & { product: Product } => Boolean(item.product));
  const unavailableItems = items.filter((item) => !productsById.has(item.productId));
  const itemCount = availableItems.reduce((total, item) => total + item.quantity, 0);
  const subtotal = availableItems.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const checkoutItems = availableItems.map((item) => ({ product_id: item.product.id, quantity: item.quantity }));
  const cannotSubmit = !hydrated || availableItems.length === 0 || unavailableItems.length > 0;
  const deliveryCharge = getDeliveryChargeForDistrict(selectedDistrict);

  return (
    <section className="py-8 md:py-10">
      <div className="container-page">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase text-blue-700">Checkout</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Complete Your Order</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            No customer account is required. Totals are rechecked on the server before the order is created.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="order-2 lg:order-1">
            <form action={formAction} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Customer Information</h2>
              {state.status === "error" ? (
                <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                  {state.message}
                </div>
              ) : null}
              {!hydrated ? (
                <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                  Loading cart...
                </div>
              ) : null}
              {hydrated && availableItems.length === 0 ? (
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Your cart is empty. Add products before checkout.
                </div>
              ) : null}
              {unavailableItems.length ? (
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Remove inactive cart items before checkout.
                </div>
              ) : null}
              <input name="cart_items" type="hidden" value={JSON.stringify(checkoutItems)} />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-950">Customer Name</span>
                  <input
                    className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
                    name="customer_name"
                    placeholder="Your full name"
                    required
                    type="text"
                  />
                  <FieldError message={state.fieldErrors.customer_name} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-950">Phone Number</span>
                  <input
                    className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
                    name="customer_phone"
                    pattern="^(?:\+?88)?01[3-9]\d{8}$"
                    placeholder="01712000000"
                    required
                    title="Enter a valid Bangladesh mobile number"
                    type="tel"
                  />
                  <FieldError message={state.fieldErrors.customer_phone} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-950">District</span>
                  <select
                    className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    name="customer_district"
                    onChange={(event) => setSelectedDistrict(event.target.value)}
                    required
                    value={selectedDistrict}
                  >
                    <option value="">Select district</option>
                    {districts.map((district) => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Dhaka delivery {formatMoney(DHAKA_DELIVERY_CHARGE)}. Other Bangladesh districts {formatMoney(OUTSIDE_DHAKA_DELIVERY_CHARGE)}.
                  </p>
                  <FieldError message={state.fieldErrors.customer_district} />
                </label>
                {onlinePaymentsEnabled ? (
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-950">Payment Method</span>
                    <select
                      className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                      name="payment_method"
                      required
                    >
                      <option value="cash-on-delivery">Cash on Delivery</option>
                      <option value="sslcommerz">SSLCommerz Online Payment</option>
                    </select>
                    <FieldError message={state.fieldErrors.payment_method} />
                  </label>
                ) : (
                  <div className="block">
                    <input name="payment_method" type="hidden" value="cash-on-delivery" />
                    <span className="text-sm font-semibold text-slate-950">Payment Method</span>
                    <div className="mt-2 flex h-12 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800">
                      Cash on Delivery
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      Online payment will be enabled after gateway verification.
                    </p>
                    <FieldError message={state.fieldErrors.payment_method} />
                  </div>
                )}
                <label className="block sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-950">Full Address</span>
                  <textarea
                    className="focus-ring mt-2 min-h-28 w-full rounded-md border border-slate-200 px-3 py-3 text-sm"
                    name="customer_address"
                    placeholder="House, road, area, nearest landmark"
                    required
                  />
                  <FieldError message={state.fieldErrors.customer_address} />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-950">Delivery Note</span>
                  <textarea
                    className="focus-ring mt-2 min-h-24 w-full rounded-md border border-slate-200 px-3 py-3 text-sm"
                    name="customer_note"
                    placeholder="Optional delivery instruction"
                  />
                </label>
              </div>
              <SubmitButton disabled={cannotSubmit} />
              <p className="mt-4 text-sm leading-6 text-slate-500">
                Cash on Delivery creates a pending order. Kena Sathi will confirm delivery details by phone.
              </p>
            </form>
          </div>

          <div className="order-1 lg:order-2 lg:sticky lg:top-24 lg:self-start">
            <OrderSummary
              deliveryCharge={deliveryCharge}
              discount={CART_DISCOUNT}
              itemCount={itemCount}
              subtotal={subtotal}
            />
            {availableItems.length ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-bold text-slate-950">Items</h2>
                <div className="mt-3 space-y-2">
                  {availableItems.map((item) => (
                    <div className="flex justify-between gap-3 text-sm" key={item.product.id}>
                      <span className="min-w-0 truncate text-slate-600">
                        {item.product.name} x {item.quantity}
                      </span>
                      <span className="font-semibold text-slate-950">
                        {formatMoney(item.product.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
