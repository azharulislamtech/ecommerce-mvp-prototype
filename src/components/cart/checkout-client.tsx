"use client";

import { useMemo, useRef, useState } from "react";
import { GIFT_CHECKBOX_LABEL } from "@/lib/gift";
import { unstable_rethrow } from "next/navigation";
import { checkoutAttempt, checkoutFingerprint, CHECKOUT_ATTEMPT_STORAGE_KEY } from "@/lib/checkout-attempt";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createOrderAction, type CheckoutFormState } from "@/app/actions";
import { useCart } from "@/components/cart/cart-provider";
import { OrderSummary } from "@/components/modules/order-summary";
import { CART_DISCOUNT } from "@/lib/cart";
import {
  DHAKA_DELIVERY_CHARGE,
  OUTSIDE_DHAKA_DELIVERY_CHARGE,
  districtOptions,
  getDeliveryChargeForDistrict
} from "@/lib/delivery";
import { formatMoney, type Product } from "@/lib/data";
import { CHECKOUT_MESSAGES } from "@/lib/order-copy";

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
      {pending ? "অর্ডার তৈরি হচ্ছে..." : "অর্ডার নিশ্চিত করুন"}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-2 text-sm font-semibold text-rose-700" role="alert">{message}</p> : null;
}

export function CheckoutClient({ districts, onlinePaymentsEnabled, products }: CheckoutClientProps) {
  const { hydrated, items } = useCart();
  const attemptRef = useRef<string | null>(null);
  const [state, formAction] = useActionState(async (previous: CheckoutFormState, formData: FormData) => {
    let saved = attemptRef.current;
    try { saved = sessionStorage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY) ?? saved; } catch { /* Memory fallback. */ }
    const attempt = checkoutAttempt(await checkoutFingerprint(formData), saved);
    attemptRef.current = JSON.stringify(attempt);
    try { sessionStorage.setItem(CHECKOUT_ATTEMPT_STORAGE_KEY, attemptRef.current); } catch { /* Memory fallback. */ }
    formData.set("idempotency_key", attempt.key);
    try {
      return await createOrderAction(previous, formData);
    } catch (error) {
      // Let Next.js handle its own redirect to the success page.
      unstable_rethrow(error);
      // A dropped connection keeps the same idempotency key, so pressing the
      // button again cannot create a second order.
      const text = (name: string) => String(formData.get(name) ?? "");
      return {
        status: "error",
        message: CHECKOUT_MESSAGES.network,
        fieldErrors: {},
        values: {
          customer_name: text("customer_name"),
          customer_phone: text("customer_phone"),
          customer_address: text("customer_address"),
          customer_note: text("customer_note"),
          send_as_gift: text("send_as_gift")
        }
      } satisfies CheckoutFormState;
    }
  }, initialState);
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
  const deliveryCharge = selectedDistrict ? getDeliveryChargeForDistrict(selectedDistrict) : null;

  return (
    <section className="py-8 md:py-10">
      <div className="container-page">
        <div className="mb-6">
          <p className="text-sm font-semibold text-blue-700">চেকআউট</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">অর্ডার সম্পন্ন করুন</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            অ্যাকাউন্ট খোলার দরকার নেই। অর্ডার নিশ্চিত করার আগে পণ্য আর ডেলিভারি চার্জ দেখে নিন।
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="order-2 lg:order-1">
            <form action={formAction} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={state.values ? JSON.stringify(state.values) : "empty"}>
              <h2 className="text-lg font-bold text-slate-950">আপনার তথ্য</h2>
              {state.status === "error" ? (
                <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800" role="alert">
                  {state.message}
                </div>
              ) : null}
              {!hydrated ? (
                <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                  কার্ট লোড হচ্ছে...
                </div>
              ) : null}
              {hydrated && availableItems.length === 0 ? (
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  আপনার কার্ট খালি। চেকআউটের আগে পণ্য যোগ করুন।
                </div>
              ) : null}
              {unavailableItems.length ? (
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  কার্টের কিছু পণ্য এখন পাওয়া যাচ্ছে না। কার্ট থেকে সেগুলো সরিয়ে তারপর অর্ডার করুন।
                </div>
              ) : null}
              <input name="cart_items" type="hidden" value={JSON.stringify(checkoutItems)} />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-950">আপনার নাম</span>
                  <input
                    autoComplete="name"
                    className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
                    defaultValue={state.values?.customer_name}
                    name="customer_name"
                    placeholder="পুরো নাম"
                    required
                    type="text"
                  />
                  <FieldError message={state.fieldErrors.customer_name} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-950">মোবাইল নম্বর</span>
                  <input
                    autoComplete="tel"
                    className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
                    inputMode="tel"
                    defaultValue={state.values?.customer_phone}
                    name="customer_phone"
                    pattern="^(?:\+?88)?01[3-9]\d{8}$"
                    placeholder="01712000000"
                    required
                    title="সঠিক বাংলাদেশি মোবাইল নম্বর লিখুন, যেমন 01712000000"
                    type="tel"
                  />
                  <FieldError message={state.fieldErrors.customer_phone} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-950">জেলা</span>
                  <select
                    className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    name="customer_district"
                    onChange={(event) => setSelectedDistrict(event.target.value)}
                    required
                    value={selectedDistrict}
                  >
                    <option value="">জেলা বেছে নিন</option>
                    {districtOptions.filter((option) => districts.includes(option.value)).map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    ডেলিভারি চার্জ: ঢাকায় {formatMoney(DHAKA_DELIVERY_CHARGE)}, ঢাকার বাইরে {formatMoney(OUTSIDE_DHAKA_DELIVERY_CHARGE)}।
                  </p>
                  <FieldError message={state.fieldErrors.customer_district} />
                </label>
                {onlinePaymentsEnabled ? (
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-950">পেমেন্টের ধরন</span>
                    <select
                      className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                      name="payment_method"
                      required
                    >
                      <option value="cash-on-delivery">ক্যাশ অন ডেলিভারি</option>
                      <option value="sslcommerz">অনলাইন পেমেন্ট (SSLCommerz)</option>
                    </select>
                    <FieldError message={state.fieldErrors.payment_method} />
                  </label>
                ) : (
                  <div className="block">
                    <input name="payment_method" type="hidden" value="cash-on-delivery" />
                    <span className="text-sm font-semibold text-slate-950">পেমেন্টের ধরন</span>
                    <div className="mt-2 flex h-12 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800">
                      ক্যাশ অন ডেলিভারি
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      পণ্য দেখে টাকা দিন। অনলাইন পেমেন্ট এখনো চালু হয়নি।
                    </p>
                    <FieldError message={state.fieldErrors.payment_method} />
                  </div>
                )}
                <label className="block sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-950">পুরো ঠিকানা</span>
                  <textarea
                    autoComplete="street-address"
                    className="focus-ring mt-2 min-h-28 w-full rounded-md border border-slate-200 px-3 py-3 text-sm"
                    defaultValue={state.values?.customer_address}
                    name="customer_address"
                    placeholder="বাসা, রাস্তা, এলাকা, কাছের চেনা জায়গা"
                    required
                  />
                  <FieldError message={state.fieldErrors.customer_address} />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-950">ডেলিভারির জন্য নোট (ঐচ্ছিক)</span>
                  <textarea
                    className="focus-ring mt-2 min-h-24 w-full rounded-md border border-slate-200 px-3 py-3 text-sm"
                    defaultValue={state.values?.customer_note}
                    name="customer_note"
                    placeholder="যেমন: বিকেলে ফোন করে আসবেন"
                  />
                </label>
                <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 sm:col-span-2">
                  <input
                    className="focus-ring mt-0.5 h-5 w-5 shrink-0 accent-blue-700"
                    defaultChecked={state.values?.send_as_gift === "on"}
                    name="send_as_gift"
                    type="checkbox"
                  />
                  <span className="text-sm leading-6 text-slate-700">
                    <span className="font-semibold text-slate-950">{GIFT_CHECKBOX_LABEL}</span>
                    <span className="block text-slate-500">বিনা খরচে। দাম আর মোট টাকা একই থাকবে।</span>
                  </span>
                </label>
              </div>
              {state.fieldErrors.cart_items ? <FieldError message={state.fieldErrors.cart_items} /> : null}
              <SubmitButton disabled={cannotSubmit} />
              <p className="mt-4 text-sm leading-6 text-slate-500">
                ক্যাশ অন ডেলিভারিতে অর্ডারটা প্রথমে অপেক্ষমাণ থাকে। ডেলিভারির আগে কেনা সাথী ফোন করে তথ্য নিশ্চিত করবে।
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
                <h2 className="text-sm font-bold text-slate-950">পণ্য</h2>
                <div className="mt-3 space-y-2">
                  {availableItems.map((item) => (
                    <div className="flex justify-between gap-3 text-sm" key={item.product.id}>
                      <span className="min-w-0 truncate text-slate-600">
                        {item.product.name} × {item.quantity}
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
