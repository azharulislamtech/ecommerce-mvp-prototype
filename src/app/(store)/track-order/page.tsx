export default function TrackOrderPage() {
  const steps = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered"];

  return (
    <section className="py-8 md:py-10">
      <div className="container-page grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm font-semibold uppercase text-blue-700">Order Tracking</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Track Your Order</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Customers can check order progress without creating an account.
          </p>
          <form className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <label className="block">
              <span className="text-sm font-semibold text-slate-950">Order ID</span>
              <input
                className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
                defaultValue="SP-1028"
                name="orderId"
                required
              />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-semibold text-slate-950">Phone Number</span>
              <input
                className="focus-ring mt-2 h-12 w-full rounded-md border border-slate-200 px-3 text-sm"
                defaultValue="01712000000"
                name="phone"
                required
                type="tel"
              />
            </label>
            <button className="focus-ring mt-5 min-h-12 w-full rounded-md bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-blue-700">
              Track Order
            </button>
          </form>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Order SP-1028</h2>
              <p className="mt-1 text-sm text-slate-600">Payment paid, delivery confirmation pending.</p>
            </div>
            <span className="inline-flex w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
              Confirmed
            </span>
          </div>
          <ol className="mt-6 space-y-4">
            {steps.map((step, index) => {
              const active = index <= 1;

              return (
                <li className="flex gap-3" key={step}>
                  <span
                    className={`mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                      active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-950">{step}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {active
                        ? "This step is complete or currently active."
                        : "This step will update after admin confirmation."}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
