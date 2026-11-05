import { CartProvider } from "@/components/cart/cart-provider";
import { HeaderStrip } from "@/components/layouts/header-strip";
import { SiteFooter } from "@/components/layouts/site-footer";
import { SiteHeader } from "@/components/layouts/site-header";
import { StoreAnalytics } from "@/components/store-analytics";
import { getStoreNav } from "@/lib/catalog";
import { mainMenuLinks } from "@/lib/store-nav";

// The header and footer menus depend on the catalog (getStoreNav). Without this, static
// pages such as the policies would keep the menu from build time forever; 60 matches the
// product pages. The lowest revalidate across layout and page wins (Next docs).
export const revalidate = 60;

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const links = mainMenuLinks(await getStoreNav());

  return (
    <CartProvider>
      {/* R11.2: keyboard users skip the strip and menus straight to the page content. */}
      <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-3 focus:font-semibold focus:text-slate-950 focus:shadow-lg" href="#main">
        মূল লেখায় যান
      </a>
      <HeaderStrip />
      <SiteHeader links={links} />
      <main id="main" tabIndex={-1}>{children}</main>
      <SiteFooter shopLinks={links.filter((link) => link.href !== "/track-order")} />
      <StoreAnalytics />
    </CartProvider>
  );
}
