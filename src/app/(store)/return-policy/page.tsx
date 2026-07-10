export const metadata = {
  title: "Return & Refund Policy",
  description: "How returns, replacements, and refunds work at Kena Sathi.",
  alternates: { canonical: "/return-policy" }
};

export default function ReturnPolicyPage() {
  return (
    <section className="py-10">
      <article className="container-page max-w-3xl">
        <p className="text-sm font-semibold uppercase text-blue-700">Legal</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Return &amp; Refund Policy</h1>
        <p className="mt-2 text-sm text-slate-500">Effective date: 10 July 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-slate-600">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Check Your Parcel at Delivery</h2>
            <p className="mt-2">
              Please check the product in front of the delivery person whenever possible. If the parcel is
              damaged, the wrong item, or incomplete, you may refuse the delivery — you pay nothing for a
              refused Cash on Delivery parcel.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">When You Can Return</h2>
            <p className="mt-2">Contact us within 48 hours of delivery if:</p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>The product arrived damaged or defective.</li>
              <li>You received the wrong product, size, or color.</li>
              <li>Something listed in the order is missing.</li>
            </ul>
            <p className="mt-2">
              The product must be unused, with its original packaging, tags, and any accessories included.
              Products damaged after delivery through use, and products bought on clearance with a declared
              fault, cannot be returned.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">How to Request a Return</h2>
            <p className="mt-2">
              Message or call us with your order number, the phone number used at checkout, and a photo of the
              problem. Our team will confirm the return and arrange pickup or guide you on sending the item
              back. Return courier costs for a verified fault are on us.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">Replacements and Refunds</h2>
            <p className="mt-2">
              After we receive and inspect the returned item, you can choose a replacement (subject to stock)
              or a refund. Refunds are sent within 7 business days of a passed inspection, via bKash, Nagad,
              or bank transfer to the number or account you provide. For orders paid online, the refund goes
              back through the original payment method where possible.
            </p>
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
