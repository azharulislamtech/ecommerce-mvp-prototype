import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney, type Product } from "@/lib/data";
import { STATE_BADGES, ageLabel } from "@/lib/storefront-state";

// R2.3: state badge plus age badge. English "Sold out" is never used.
export function ProductStateBadges({ product }: { product: Product }) {
  const badge = STATE_BADGES[product.state];
  const age = ageLabel(product.ageMinMonths, product.ageMaxMonths);
  return (
    <>
      <StatusBadge testId="product-state-badge" tone={badge.tone}>{badge.label}</StatusBadge>
      {age ? <StatusBadge testId="product-age-badge" tone="blue">{age}</StatusBadge> : null}
    </>
  );
}

// A coming-soon product has no confirmed price: show the estimate, never the stored price.
export function ProductPrice({ product, size }: { product: Product; size: "card" | "page" }) {
  const big = size === "page" ? "text-3xl" : "text-xl";
  if (product.state === "coming_soon") {
    return product.estimatedPrice !== undefined ? (
      <span className="flex flex-wrap items-baseline gap-2" data-testid="product-price">
        <span className="text-sm font-semibold text-slate-600">আনুমানিক দাম</span>
        <span className={`${big} font-bold text-slate-950`}>{formatMoney(product.estimatedPrice)}</span>
      </span>
    ) : (
      <span className="text-sm font-semibold text-slate-600" data-testid="product-price">দাম পরে জানানো হবে</span>
    );
  }
  return (
    <span className="flex flex-wrap items-end gap-2" data-testid="product-price">
      <span className={`${big} font-bold text-slate-950`}>{formatMoney(product.price)}</span>
      {product.oldPrice ? <span className="text-sm text-slate-400 line-through">{formatMoney(product.oldPrice)}</span> : null}
    </span>
  );
}

// What replaces the buy buttons when the product cannot be bought.
// `link` adds the "আগ্রহ জানান" button on cards; the product page shows the form itself.
export function ProductUnavailableNote({ product, link = false }: { product: Product; link?: boolean }) {
  if (product.state === "stock_ended") {
    return <p className="text-sm font-semibold text-slate-600" data-testid="product-unavailable-note">স্টক শেষ — এখন অর্ডার নেওয়া হচ্ছে না।</p>;
  }
  if (product.state === "coming_soon") {
    return (
      <div data-testid="product-unavailable-note">
        <p className="text-sm font-semibold text-orange-800">শীঘ্রই আসছে — পণ্য হাতে আসার আগে কোনো অর্ডার বা টাকা নেওয়া হয় না।</p>
        {link ? (
          <Link className="focus-ring mt-2 inline-flex min-h-11 items-center rounded-md border border-orange-300 bg-orange-50 px-4 text-sm font-semibold text-orange-900 hover:bg-orange-100" href={`/products/${product.slug}#interest`}>
            আগ্রহ জানান
          </Link>
        ) : null}
      </div>
    );
  }
  return null;
}
