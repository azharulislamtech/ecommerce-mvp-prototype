import "server-only";

import { createSupabaseAuthServerClient } from "./auth";
import { createSupabaseServiceClient } from "./server";
import type { Database } from "./database.types";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];

export type AdminOrderListFilters = {
  orderStatus?: string;
  paymentStatus?: string;
  q?: string;
};

export type OrderDetails = OrderRow & {
  items: OrderItemRow[];
  payments: PaymentRow[];
};

export type PublicTrackedOrder = Pick<
  OrderRow,
  | "order_number"
  | "customer_district"
  | "subtotal"
  | "delivery_charge"
  | "discount_amount"
  | "total_amount"
  | "order_status"
  | "payment_status"
  | "created_at"
  | "updated_at"
> & {
  items: Pick<OrderItemRow, "id" | "product_name" | "unit_price" | "quantity" | "total_price">[];
};

function normalize(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function matchesOrderSearch(order: OrderRow, query: string) {
  if (!query) {
    return true;
  }

  const haystack = `${order.order_number} ${order.customer_name} ${order.customer_phone}`.toLowerCase();
  return haystack.includes(query);
}

function normalizePhoneForLookup(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 13 && digits.startsWith("88") ? digits.slice(2) : digits;
}

export async function getOrderSuccessSummary(orderNumber: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .select("order_number,total_amount,payment_status,order_status,created_at")
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load order summary: ${error.message}`);
  }

  return data;
}

export async function getPublicTrackedOrder(orderNumber: string, phone: string): Promise<PublicTrackedOrder | null> {
  const normalizedOrderNumber = orderNumber.trim().toUpperCase();
  const normalizedPhone = normalizePhoneForLookup(phone);

  if (!normalizedOrderNumber || !/^01[3-9]\d{8}$/.test(normalizedPhone)) {
    return null;
  }

  const supabase = createSupabaseServiceClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id,order_number,customer_phone,customer_district,subtotal,delivery_charge,discount_amount,total_amount,order_status,payment_status,created_at,updated_at"
    )
    .ilike("order_number", normalizedOrderNumber)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to track order: ${error.message}`);
  }

  if (!order || normalizePhoneForLookup(order.customer_phone) !== normalizedPhone) {
    return null;
  }

  const { data: items, error: itemError } = await supabase
    .from("order_items")
    .select("id,product_name,unit_price,quantity,total_price")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });

  if (itemError) {
    throw new Error(`Failed to load tracked order items: ${itemError.message}`);
  }

  return {
    order_number: order.order_number,
    customer_district: order.customer_district,
    subtotal: order.subtotal,
    delivery_charge: order.delivery_charge,
    discount_amount: order.discount_amount,
    total_amount: order.total_amount,
    order_status: order.order_status,
    payment_status: order.payment_status,
    created_at: order.created_at,
    updated_at: order.updated_at,
    items: items ?? []
  };
}

export async function getAdminOrders(filters: AdminOrderListFilters = {}) {
  const supabase = createSupabaseAuthServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load admin orders: ${error.message}`);
  }

  const query = normalize(filters.q);
  const paymentStatus = normalize(filters.paymentStatus);
  const orderStatus = normalize(filters.orderStatus);

  return data
    .filter((order) => matchesOrderSearch(order, query))
    .filter((order) => (paymentStatus ? order.payment_status === paymentStatus : true))
    .filter((order) => (orderStatus ? order.order_status === orderStatus : true));
}

export async function getAdminOrderDetails(orderNumber: string): Promise<OrderDetails | null> {
  const supabase = createSupabaseAuthServerClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load admin order ${orderNumber}: ${error.message}`);
  }

  if (!order) {
    return null;
  }

  const [{ data: items, error: itemError }, { data: payments, error: paymentError }] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", order.id).order("created_at", { ascending: true }),
    supabase.from("payments").select("*").eq("order_id", order.id).order("created_at", { ascending: true })
  ]);

  if (itemError) {
    throw new Error(`Failed to load order items: ${itemError.message}`);
  }

  if (paymentError) {
    throw new Error(`Failed to load order payments: ${paymentError.message}`);
  }

  return {
    ...order,
    items: items ?? [],
    payments: payments ?? []
  };
}
