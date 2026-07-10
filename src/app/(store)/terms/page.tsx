export const metadata = {
  title: "Terms & Conditions",
  description: "The terms that apply when you shop with Kena Sathi.",
  alternates: { canonical: "/terms" }
};

export default function TermsPage() {
  return (
    <section className="py-10">
      <article className="container-page max-w-3xl">
        <p className="text-sm font-semibold uppercase text-blue-700">Legal</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Terms &amp; Conditions</h1>
        <p className="mt-2 text-sm text-slate-500">Effective date: 10 July 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-slate-600">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Orders</h2>
            <p className="mt-2">
              Placing an order on Kena Sathi is an offer to purchase. An order is confirmed once our team
              verifies it, and you can follow its status any time on the Track Order page using your order
              number and the phone number used at checkout. We may cancel an order if a product is out of
              stock, the delivery address cannot be served, or the order appears fraudulent — in that case we
              will inform you.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">Pricing and Delivery Charges</h2>
            <p className="mt-2">
              All prices are shown in Bangladeshi Taka (BDT). The delivery charge is calculated at checkout:
              BDT 60 inside Dhaka and BDT 120 for all other districts of Bangladesh. The total you see at
              checkout is the final amount payable — there are no hidden charges.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">Payment</h2>
            <p className="mt-2">
              Cash on Delivery is currently the active payment method: you pay the courier when your parcel
              arrives. If online payment becomes available, it will be processed through a licensed payment
              gateway and clearly indicated at checkout.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">Delivery</h2>
            <p className="mt-2">
              Delivery times depend on courier coverage in your area. Delays caused by the courier, weather,
              or events outside our control can happen; we will keep the order status updated. Please provide
              a complete address and keep your phone reachable on the delivery day.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">Cancellations</h2>
            <p className="mt-2">
              You may cancel an order free of charge any time before it is shipped by contacting us with your
              order number. Once an order is shipped, please follow the Return &amp; Refund Policy instead.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">Product Reviews</h2>
            <p className="mt-2">
              Only customers with a delivered order containing the product can submit a review, and every
              review is moderated before publication. We may reject reviews that contain abusive language,
              personal information, or content unrelated to the product.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">Limitation of Liability</h2>
            <p className="mt-2">
              Our responsibility for any order is limited to the amount you paid for that order. We are not
              liable for indirect losses caused by delivery delays or product unavailability.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">Governing Law</h2>
            <p className="mt-2">These terms are governed by the laws of the People&apos;s Republic of Bangladesh.</p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">Contact</h2>
            <p className="mt-2">
              Email: support@kenasathi.com
              <br />
              Phone: 01717121839
            </p>
          </div>
        </div>
      </article>
    </section>
  );
}
