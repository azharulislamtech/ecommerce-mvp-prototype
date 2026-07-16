// Customers check out without an account, so the order id only ever exists on
// the confirmation screen. Remembering it per device turns "I closed the tab"
// from a support call into a one-tap link.
export const RECENT_ORDERS_STORAGE_KEY = "shoppilot-recent-orders-v1";

const MAX_RECENT_ORDERS = 5;

export type RecentOrder = {
  orderNumber: string;
  trackingToken: string;
  savedAt: string;
};

function isRecentOrder(value: unknown): value is RecentOrder {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<RecentOrder>;

  return (
    typeof candidate.orderNumber === "string" &&
    candidate.orderNumber.length > 0 &&
    typeof candidate.trackingToken === "string" &&
    candidate.trackingToken.length >= 32 &&
    typeof candidate.savedAt === "string"
  );
}

export function readRecentOrders(): RecentOrder[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_ORDERS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isRecentOrder).slice(0, MAX_RECENT_ORDERS);
  } catch {
    return [];
  }
}

function writeRecentOrders(orders: RecentOrder[]) {
  try {
    window.localStorage.setItem(RECENT_ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch {
    // Private-mode browsers refuse writes. Tracking by order id and phone still works.
  }

  return orders;
}

export function saveRecentOrder(entry: Omit<RecentOrder, "savedAt">): RecentOrder[] {
  if (typeof window === "undefined") {
    return [];
  }

  const deduplicated = readRecentOrders().filter((order) => order.orderNumber !== entry.orderNumber);

  return writeRecentOrders(
    [{ ...entry, savedAt: new Date().toISOString() }, ...deduplicated].slice(0, MAX_RECENT_ORDERS)
  );
}

export function forgetRecentOrder(orderNumber: string): RecentOrder[] {
  if (typeof window === "undefined") {
    return [];
  }

  return writeRecentOrders(readRecentOrders().filter((order) => order.orderNumber !== orderNumber));
}
