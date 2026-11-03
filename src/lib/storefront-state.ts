// R2.3: the four storefront states (docs/product-guideline-common.md §৩.২). Same rule as
// the database function storefront_state(); tests/unit/storefront-state.test.ts checks
// both agree on every case.

export type StorefrontState = "in_stock" | "stock_ended" | "coming_soon" | "hidden";

export type StateInput = {
  isActive: boolean;
  availability: "available" | "coming_soon" | null | undefined;
  stock: number;
  firstStockedAt: string | null | undefined;
};

export function storefrontState({ isActive, availability, stock, firstStockedAt }: StateInput): StorefrontState {
  if (!isActive) return "hidden";
  if (availability === "coming_soon") return stock === 0 ? "coming_soon" : "hidden";
  if (stock > 0) return "in_stock";
  // "স্টক শেষ" only for goods that really were in stock once; never-stocked rows stay hidden.
  return firstStockedAt ? "stock_ended" : "hidden";
}

export const canBuy = (state: StorefrontState) => state === "in_stock";

export const STATE_BADGES: Record<Exclude<StorefrontState, "hidden">, { label: string; tone: "green" | "slate" | "orange" }> = {
  in_stock: { label: "স্টকে আছে", tone: "green" },
  stock_ended: { label: "স্টক শেষ", tone: "slate" },
  coming_soon: { label: "শীঘ্রই আসছে", tone: "orange" }
};

// Listing order: what can be bought first, then coming soon, then stock ended.
export const STATE_RANK: Record<StorefrontState, number> = { in_stock: 0, coming_soon: 1, stock_ended: 2, hidden: 3 };

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const bn = (value: number) => String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

function ageText(months: number) {
  return months >= 12 && months % 12 === 0 ? `${bn(months / 12)} বছর` : `${bn(months)} মাস`;
}

// Age badge from the V11 month range, such as "বয়স ৩–৬ বছর".
export function ageLabel(min: number | null | undefined, max: number | null | undefined) {
  const hasMin = typeof min === "number";
  const hasMax = typeof max === "number";
  if (!hasMin && !hasMax) return null;
  if (hasMin && hasMax) {
    const sameUnit = min >= 12 && max >= 12 && min % 12 === 0 && max % 12 === 0;
    if (sameUnit) return `বয়স ${bn(min / 12)}–${bn(max / 12)} বছর`;
    return `বয়স ${ageText(min)} – ${ageText(max)}`;
  }
  return hasMin ? `বয়স ${ageText(min!)}+` : `বয়স ${ageText(max!)} পর্যন্ত`;
}
