export const metadata = {
  title: "Privacy Policy",
  description: "How Kena Sathi collects, uses, and protects your personal information.",
  alternates: { canonical: "/privacy-policy" }
};

export default function PrivacyPolicyPage() {
  return (
    <section className="py-10">
      <article className="container-page max-w-3xl">
        <p className="text-sm font-semibold uppercase text-blue-700">Legal</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-500">Effective date: 10 July 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-slate-600">
          <div>
            <h2 className="text-lg font-bold text-slate-950">What We Collect</h2>
            <p className="mt-2">
              When you place an order, we collect the information needed to deliver it: your name, mobile
              number, delivery district and address, and any note you add to the order. If you submit a
              product review, we also store your order number and the review content.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">How We Use Your Information</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>To process, deliver, and provide updates about your order.</li>
              <li>To verify your identity when you track an order or submit a verified review.</li>
              <li>To contact you about your order if the courier or our team needs clarification.</li>
              <li>To keep basic sales records required for running the business.</li>
            </ul>
            <p className="mt-2">
              We do not sell, rent, or trade your personal information to any third party. Your details are
              shared only with the delivery courier, and only as much as is needed to deliver your parcel.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">Cookies and Local Storage</h2>
            <p className="mt-2">
              Your shopping cart is stored in your own browser. We use only the cookies necessary for the
              website to function, such as keeping the admin area secure. We do not use third-party
              advertising cookies.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">Data Storage and Security</h2>
            <p className="mt-2">
              Order data is stored securely with our database provider and protected by access controls.
              Payment card details are never stored on our servers; when online payment is available, it is
              processed by the payment gateway on their secure systems.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">Your Rights</h2>
            <p className="mt-2">
              You may ask us what information we hold about you, request a correction, or request deletion of
              your data (except records we must keep for completed transactions). Contact us and we will
              respond within a reasonable time.
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
