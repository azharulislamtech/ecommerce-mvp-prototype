import Link from "next/link";
import { formatMoney } from "@/lib/data";
import { DHAKA_DELIVERY_CHARGE, OUTSIDE_DHAKA_DELIVERY_CHARGE } from "@/lib/delivery";
import { RETURN_POLICY_PATH, RETURN_WINDOW_LINE, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from "@/lib/order-copy";

// R2.1: the black strip on every page (wireframe §৪). Charges come from delivery.ts and the
// return line from order-copy.ts, so the strip can never disagree with checkout or the policy.
export function HeaderStrip() {
  return (
    <div className="bg-slate-950 text-white" data-testid="header-strip" lang="bn">
      <ul className="container-page flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-center text-[11px] leading-5 sm:text-xs">
        <li>
          ডেলিভারি: ঢাকায় {formatMoney(DHAKA_DELIVERY_CHARGE)}, ঢাকার বাইরে {formatMoney(OUTSIDE_DHAKA_DELIVERY_CHARGE)}
        </li>
        <li aria-hidden="true" className="text-slate-500">·</li>
        <li>ক্যাশ অন ডেলিভারি</li>
        <li aria-hidden="true" className="text-slate-500">·</li>
        <li>পণ্য দেখে টাকা দিন</li>
        <li aria-hidden="true" className="text-slate-500">·</li>
        <li>
          <Link className="underline decoration-slate-500 underline-offset-2 hover:text-amber-300" href={RETURN_POLICY_PATH}>
            {RETURN_WINDOW_LINE}
          </Link>
        </li>
        <li aria-hidden="true" className="text-slate-500">·</li>
        <li>
          হটলাইন:{" "}
          <a className="font-semibold hover:text-amber-300" href={SUPPORT_PHONE_TEL}>
            {SUPPORT_PHONE_DISPLAY}
          </a>
        </li>
      </ul>
    </div>
  );
}
