import { CartProvider } from "@/components/cart/cart-provider";
import { SiteFooter } from "@/components/layouts/site-footer";
import { SiteHeader } from "@/components/layouts/site-header";
import { StoreAnalytics } from "@/components/store-analytics";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <StoreAnalytics />
    </CartProvider>
  );
}
