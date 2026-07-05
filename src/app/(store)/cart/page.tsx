import { CartPageClient } from "@/components/cart/cart-page-client";
import { getStoreProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const products = await getStoreProducts();

  return <CartPageClient products={products} />;
}
