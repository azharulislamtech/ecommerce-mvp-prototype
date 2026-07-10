import Link from "next/link";
import { BrandLogo } from "@/components/ui/brand-logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <BrandLogo href="/" />
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">
            Kena Sathi is a trusted online shopping partner for everyday products, clear pricing,
            easy checkout, and dependable delivery updates.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-950">Contact</h3>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>
              Phone:{" "}
              <a className="hover:text-blue-700" href="tel:+8801717121839">
                01717121839
              </a>
            </li>
            <li>
              Email:{" "}
              <a className="hover:text-blue-700" href="mailto:support@kenasathi.com">
                support@kenasathi.com
              </a>
            </li>
            <li>
              <a className="hover:text-blue-700" href="https://www.facebook.com/kenasathibd" rel="noopener noreferrer" target="_blank">
                Facebook
              </a>
            </li>
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
              <Link className="hover:text-blue-700" href="/return-policy">
                Return &amp; Refund Policy
              </Link>
            </li>
            <li>
              <Link className="hover:text-blue-700" href="/terms">
                Terms &amp; Conditions
              </Link>
            </li>
            <li>
              <Link className="hover:text-blue-700" href="/privacy-policy">
                Privacy Policy
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
        <p className="container-page text-sm text-slate-500">Copyright 2026 Kena Sathi. All rights reserved.</p>
      </div>
    </footer>
  );
}