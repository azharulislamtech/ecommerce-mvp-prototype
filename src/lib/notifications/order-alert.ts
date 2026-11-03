import { formatMoney } from "@/lib/data";

// The owner's Telegram gets only what is needed to act on a new order. No customer name,
// phone, address or note: those stay in the admin panel (privacy policy, R2.7).
export type OrderAlertInput = {
  orderNumber: string;
  totalAmount: number;
  itemCount: number;
  paymentMethod: string;
  district: string;
  siteUrl: string;
};

export function buildOrderAlert(order: OrderAlertInput) {
  // The admin order page is keyed by order number (getAdminOrderDetails).
  const adminLink = `${order.siteUrl.replace(/\/+$/, "")}/admin/orders/${encodeURIComponent(order.orderNumber)}`;
  return [
    "New order " + order.orderNumber,
    "Total: " + formatMoney(order.totalAmount) + " (" + order.paymentMethod + ")",
    "Items: " + order.itemCount,
    "District: " + order.district,
    "Open: " + adminLink
  ].join("\n");
}
