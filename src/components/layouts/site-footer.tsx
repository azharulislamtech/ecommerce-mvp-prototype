import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link className="flex items-center gap-2" href="/">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-slate-950 text-sm font-bold text-white">
              SP
            </span>
            <span className="text-lg font-bold text-slate-950">ShopPilot</span>
          </Link>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">
            A clean single-brand store prototype focused on fast product discovery, simple checkout,
            and trustworthy payment flow.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-950">Contact</h3>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>Phone: 01700-000000</li>
            <li>Email: hello@shoppilot.local</li>
            <li>Facebook: /shoppilot</li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-950">Important Links</h3>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>
              <Link className="hover:text-blue-700" href="/products">
                Products
              </Link>
            </li>
            <li>
              <Link className="hover:text-blue-700" href="/track-order">
                Track Order
              </Link>
            </li>
            <li>
              <Link className="hover:text-blue-700" href="/admin/login">
                Admin Login
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200 py-4">
        <p className="container-page text-sm text-slate-500">Copyright 2026 ShopPilot. All rights reserved.</p>
      </div>
    </footer>
  );
}
