import Link from "next/link";
import { BrandLogo } from "@/components/ui/brand-logo";
import { RETURN_POLICY_PATH, RETURN_WINDOW_LINE, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from "@/lib/order-copy";

type MenuLink = { href: string; label: string };

const linkClass = "hover:text-blue-700";

// R2.2: shop links (same rule as the header: a section shows only with real products),
// help and contact, all in Bangla.
export function SiteFooter({ shopLinks }: { shopLinks: MenuLink[] }) {
  return (
    <footer className="border-t border-slate-200 bg-white" data-testid="site-footer" lang="bn">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <BrandLogo href="/" label="কেনা সাথী" />
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">
            শিশুদের শেখার জিনিস আর সংসারের কাজের সহজ সমাধান। পণ্য হাতে থাকলে তবেই বিক্রি, দাম আর তথ্য সৎভাবে।
          </p>
          <p className="mt-3 text-sm font-semibold text-slate-700">
            <Link className={linkClass} href={RETURN_POLICY_PATH}>{RETURN_WINDOW_LINE}</Link>
          </p>
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-950">কেনাকাটা</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {shopLinks.map((link) => (
              <li key={link.href}>
                <Link className={linkClass} href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-950">সাহায্য</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li><Link className={linkClass} href="/track-order">অর্ডার ট্র্যাক করুন</Link></li>
            <li><Link className={linkClass} href={RETURN_POLICY_PATH}>রিটার্ন ও টাকা ফেরতের নীতি</Link></li>
            <li><Link className={linkClass} href="/privacy-policy">গোপনীয়তা নীতি</Link></li>
            <li><Link className={linkClass} href="/terms">শর্তাবলি</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-950">যোগাযোগ</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>
              ফোন: <a className={linkClass} href={SUPPORT_PHONE_TEL}>{SUPPORT_PHONE_DISPLAY}</a>
            </li>
            <li>
              ইমেইল: <a className={linkClass} href="mailto:support@kenasathi.com">support@kenasathi.com</a>
            </li>
            <li>
              <a className={linkClass} href="https://www.facebook.com/kenasathibd" rel="noopener noreferrer" target="_blank">
                Facebook পেজ
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200 py-4">
        <div className="container-page flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
          <p>© ২০২৬ কেনা সাথী</p>
          <Link className="text-xs hover:text-blue-700" href="/admin/login">অ্যাডমিন</Link>
        </div>
      </div>
    </footer>
  );
}
