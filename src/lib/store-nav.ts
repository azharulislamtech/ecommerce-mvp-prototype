import type { StoreNav } from "@/lib/catalog";

// R2.1: the main menu. Section links appear only when the catalog has real products
// behind them (getStoreNav); the full section pages come later (R3–R7).
export function mainMenuLinks(nav: StoreNav) {
  return [
    { href: "/products", label: "সব পণ্য", show: true },
    { href: "/kids", label: "Kids & Baby", show: nav.kids },
    { href: "/products?section=home", label: "সংসারের সমাধান", show: nav.home },
    { href: "/products?availability=coming_soon", label: "শীঘ্রই আসছে", show: nav.comingSoon },
    { href: "/track-order", label: "অর্ডার ট্র্যাক", show: true }
  ]
    .filter((link) => link.show)
    .map(({ href, label }) => ({ href, label }));
}
