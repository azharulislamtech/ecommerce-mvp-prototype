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
      <HeaderStrip />
      <SiteHeader links={links} />
      <main>{children}</main>
      <SiteFooter shopLinks={links.filter((link) => link.href !== "/track-order")} />
      <StoreAnalytics />
    </CartProvider>
  );
}
