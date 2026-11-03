import { CartPageClient } from "@/components/cart/cart-page-client";
import { getStorePurchasableProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const products = await getStorePurchasableProducts();

  return <CartPageClient products={products} />;
}
