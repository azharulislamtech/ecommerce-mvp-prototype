import { CheckoutClient } from "@/components/cart/checkout-client";
import { getStoreProducts } from "@/lib/catalog";
import { districts } from "@/lib/delivery";
import { isOnlineCheckoutEnabled } from "@/lib/payments/payment-service";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const products = await getStoreProducts();

  return <CheckoutClient districts={districts} onlinePaymentsEnabled={isOnlineCheckoutEnabled()} products={products} />;
}
