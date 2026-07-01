import { createOrderAction } from "@/app/actions";
import { OrderSummary } from "@/components/modules/order-summary";
import { districts } from "@/lib/data";

export default function CheckoutPage() {
  return (
    <section className="py-8 md:py-10">
      <div className="container-page">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase text-blue-700">Checkout</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Complete Your Order</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            No customer account is required. Keep the form short, confirm total, then continue to payment.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="order-2 lg:order-1">
            <form action={createOrderAction} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Customer Information</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-950">Customer Name</span>
                  <input
                    className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
                    name="customerName"
                    placeholder="Your full name"
                    required
                    type="text"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-950">Phone Number</span>
                  <input
                    className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
                    name="phone"
                    pattern="^(?:\\+?88)?01[3-9]\\d{8}$"
                    placeholder="01712000000"
                    required
                    title="Enter a valid Bangladesh mobile number"
                    type="tel"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-950">District</span>
                  <select
                    className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    name="district"
                    required
                  >
                    <option value="">Select district</option>
                    {districts.map((district) => (
                      <option key={district}>{district}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-950">Payment Method</span>
                  <select
                    className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    name="paymentMethod"
                    required
                  >
                    <option>Payment Gateway</option>
                    <option>Cash on Delivery</option>
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-950">Full Address</span>
                  <textarea
                    className="focus-ring mt-2 min-h-28 w-full rounded-md border border-slate-200 px-3 py-3 text-sm"
                    name="address"
                    placeholder="House, road, area, nearest landmark"
                    required
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-950">Delivery Note</span>
                  <textarea
                    className="focus-ring mt-2 min-h-24 w-full rounded-md border border-slate-200 px-3 py-3 text-sm"
                    name="note"
                    placeholder="Optional delivery instruction"
                  />
                </label>
              </div>
              <button className="focus-ring mt-6 min-h-12 w-full rounded-md bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-blue-700">
                Pay Now
              </button>
              <p className="mt-4 text-sm leading-6 text-slate-500">
                This prototype creates a pending order and redirects to a payment result placeholder.
              </p>
            </form>
          </div>

          <div className="order-1 lg:order-2 lg:sticky lg:top-24 lg:self-start">
            <OrderSummary />
          </div>
        </div>
      </div>
    </section>
  );
}
