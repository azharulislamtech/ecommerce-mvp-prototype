import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Database, Json, PaymentStatus } from "@/lib/supabase/database.types";
import type { PaymentInitiationResult } from "./payment-service";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;

type PaymentContext = {
  order: OrderRow;
  items: OrderItemRow[];
  payment: PaymentRow;
};

type GatewayPayload = Record<string, string>;
type GatewayJson = Record<string, unknown>;

type NotificationSource = "success" | "fail" | "cancel" | "ipn";

export type SslcommerzNotificationResult = {
  orderNumber: string | null;
  paymentStatus: PaymentStatus | "unknown";
  customerRedirect: "success" | "failed";
  message: string;
};

const PROVIDER_NAME = "sslcommerz";
const BDT = "BDT";

function getMode() {
  return process.env.SSLCOMMERZ_MODE?.toLowerCase() === "live" ? "live" : "sandbox";
}

function getProviderBaseUrl() {
  return getMode() === "live" ? "https://securepay.sslcommerz.com" : "https://sandbox.sslcommerz.com";
}

function getStorePassword() {
  return process.env.SSLCOMMERZ_STORE_PASSWORD ?? process.env.SSLCOMMERZ_STORE_PASSWD;
}

function getConfig() {
  const storeId = process.env.SSLCOMMERZ_STORE_ID;
  const storePassword = getStorePassword();

  if (!storeId || !storePassword) {
    return null;
  }

  const baseUrl = getProviderBaseUrl();

  return {
    storeId,
    storePassword,
    initUrl: `${baseUrl}/gwprocess/v4/api.php`,
    validationUrl: `${baseUrl}/validator/api/validationserverAPI.php`,
    transactionQueryUrl: `${baseUrl}/validator/api/merchantTransIDvalidationAPI.php`
  };
}

export function isSslcommerzConfigured() {
  return Boolean(getConfig());
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function formatAmount(value: number) {
  return value.toFixed(2);
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function asJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function sameMoney(left: number, right: number) {
  return Math.round(left * 100) === Math.round(right * 100);
}

function parseMoney(value: unknown) {
  const parsed = Number(text(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function currentTimestamp() {
  return new Date().toISOString();
}

async function logPaymentEvent(
  supabase: SupabaseServiceClient,
  paymentId: string,
  eventType: string,
  payload: unknown
) {
  const { error } = await supabase.from("payment_events").insert({
    payment_id: paymentId,
    event_type: eventType,
    event_payload: asJson(payload)
  });

  if (error) {
    console.error(`Could not log payment event ${eventType}:`, error.message);
  }
}

async function loadPaymentContextByOrderId(supabase: SupabaseServiceClient, orderId: string) {
  const { data: order, error: orderError } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();

  if (orderError) {
    throw new Error(`Failed to load order for payment: ${orderError.message}`);
  }

  if (!order) {
    return null;
  }

  return loadPaymentContextForOrder(supabase, order);
}

async function loadPaymentContextByOrderNumber(supabase: SupabaseServiceClient, orderNumber: string) {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (orderError) {
    throw new Error(`Failed to load order for payment callback: ${orderError.message}`);
  }

  if (!order) {
    return null;
  }

  return loadPaymentContextForOrder(supabase, order);
}

async function loadPaymentContextForOrder(supabase: SupabaseServiceClient, order: OrderRow) {
  const [{ data: items, error: itemsError }, { data: payment, error: paymentError }] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", order.id).order("created_at", { ascending: true }),
    supabase
      .from("payments")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  if (itemsError) {
    throw new Error(`Failed to load order items for payment: ${itemsError.message}`);
  }

  if (paymentError) {
    throw new Error(`Failed to load payment row: ${paymentError.message}`);
  }

  if (!payment) {
    throw new Error(`No payment row exists for order ${order.order_number}.`);
  }

  return {
    order,
    items: items ?? [],
    payment
  };
}

function buildCallbackUrl(appBaseUrl: string, suffix: string) {
  return `${trimTrailingSlash(appBaseUrl)}/api/payments/sslcommerz/${suffix}`;
}

function buildCartPayload(items: OrderItemRow[]) {
  return items.map((item) => ({
    sku: item.product_id ?? item.id,
    product: truncate(item.product_name, 255),
    quantity: String(item.quantity),
    amount: formatAmount(item.total_price),
    unit_price: formatAmount(item.unit_price)
  }));
}

function buildSessionParams(context: PaymentContext, appBaseUrl: string, storeId: string, storePassword: string) {
  const { order, items } = context;
  const productNames = truncate(items.map((item) => item.product_name).join(", "), 255) || "ShopPilot order";
  const customerEmail = process.env.SSLCOMMERZ_DEFAULT_CUSTOMER_EMAIL ?? "customer@example.com";

  return new URLSearchParams({
    store_id: storeId,
    store_passwd: storePassword,
    total_amount: formatAmount(order.total_amount),
    currency: BDT,
    tran_id: order.order_number,
    success_url: buildCallbackUrl(appBaseUrl, "success"),
    fail_url: buildCallbackUrl(appBaseUrl, "fail"),
    cancel_url: buildCallbackUrl(appBaseUrl, "cancel"),
    ipn_url: buildCallbackUrl(appBaseUrl, "ipn"),
    cus_name: truncate(order.customer_name, 50),
    cus_email: truncate(customerEmail, 50),
    cus_add1: truncate(order.customer_address, 50),
    cus_add2: "",
    cus_city: truncate(order.customer_district, 50),
    cus_state: truncate(order.customer_district, 50),
    cus_postcode: "1000",
    cus_country: "Bangladesh",
    cus_phone: truncate(order.customer_phone, 20),
    shipping_method: "YES",
    num_of_item: String(items.length),
    ship_name: truncate(order.customer_name, 50),
    ship_add1: truncate(order.customer_address, 50),
    ship_add2: "",
    ship_area: truncate(order.customer_district, 50),
    ship_city: truncate(order.customer_district, 50),
    ship_state: truncate(order.customer_district, 50),
    ship_postcode: "1000",
    ship_country: "Bangladesh",
    product_name: productNames,
    product_category: "ecommerce",
    product_profile: "physical-goods",
    cart: JSON.stringify(buildCartPayload(items)),
    product_amount: formatAmount(order.subtotal),
    vat: "0.00",
    discount_amount: formatAmount(order.discount_amount),
    convenience_fee: "0.00",
    emi_option: "0",
    value_a: order.id,
    value_b: context.payment.id,
    value_c: order.order_number,
    value_d: "shoppilot"
  });
}

async function fetchGatewayJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store"
  });
  const body = (await response.json().catch(() => null)) as GatewayJson | null;

  if (!response.ok || !body) {
    throw new Error(`SSLCommerz returned HTTP ${response.status}.`);
  }

  return body;
}

export async function initiateSslcommerzPayment({
  orderId,
  appBaseUrl
}: {
  orderId: string;
  appBaseUrl: string;
}): Promise<PaymentInitiationResult> {
  const config = getConfig();

  if (!config) {
    return {
      ok: false,
      message: "SSLCommerz is not configured."
    };
  }

  const supabase = createSupabaseServiceClient();
  const context = await loadPaymentContextByOrderId(supabase, orderId);

  if (!context) {
    return {
      ok: false,
      message: "Order was created, but payment could not find it."
    };
  }

  if (context.payment.payment_status !== "pending") {
    return {
      ok: false,
      message: "This order is not waiting for payment."
    };
  }

  await supabase
    .from("payments")
    .update({
      gateway_name: PROVIDER_NAME,
      gateway_transaction_id: context.order.order_number,
      payment_method: PROVIDER_NAME
    })
    .eq("id", context.payment.id);

  const params = buildSessionParams(context, appBaseUrl, config.storeId, config.storePassword);

  try {
    const gatewayResponse = await fetchGatewayJson(config.initUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });
    const status = text(gatewayResponse.status).toUpperCase();
    const redirectUrl = text(gatewayResponse.GatewayPageURL);

    if (status !== "SUCCESS" || !redirectUrl.startsWith("https://")) {
      await logPaymentEvent(supabase, context.payment.id, "sslcommerz.initiation_failed", {
        status,
        response: gatewayResponse,
        order_number: context.order.order_number
      });

      return {
        ok: false,
        message: text(gatewayResponse.failedreason) || "SSLCommerz did not create a payment session."
      };
    }

    await supabase
      .from("payments")
      .update({
        gateway_name: PROVIDER_NAME,
        gateway_transaction_id: context.order.order_number,
        payment_method: PROVIDER_NAME,
        gateway_response: asJson({
          provider: PROVIDER_NAME,
          mode: getMode(),
          event: "initiation",
          sessionkey: text(gatewayResponse.sessionkey),
          response: gatewayResponse,
          updated_at: currentTimestamp()
        })
      })
      .eq("id", context.payment.id);

    await logPaymentEvent(supabase, context.payment.id, "sslcommerz.initiated", {
      order_number: context.order.order_number,
      mode: getMode(),
      sessionkey: text(gatewayResponse.sessionkey),
      response: gatewayResponse
    });

    return {
      ok: true,
      redirectUrl
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "SSLCommerz payment initiation failed.";

    await logPaymentEvent(supabase, context.payment.id, "sslcommerz.initiation_error", {
      order_number: context.order.order_number,
      message
    });

    return {
      ok: false,
      message
    };
  }
}

async function validateByValidationId(valId: string) {
  const config = getConfig();

  if (!config) {
    throw new Error("SSLCommerz is not configured.");
  }

  const url = new URL(config.validationUrl);
  url.searchParams.set("val_id", valId);
  url.searchParams.set("store_id", config.storeId);
  url.searchParams.set("store_passwd", config.storePassword);
  url.searchParams.set("format", "json");

  return fetchGatewayJson(url.toString());
}

async function queryByTransactionId(orderNumber: string, valId?: string) {
  const config = getConfig();

  if (!config) {
    throw new Error("SSLCommerz is not configured.");
  }

  const url = new URL(config.transactionQueryUrl);
  url.searchParams.set("tran_id", orderNumber);
  url.searchParams.set("store_id", config.storeId);
  url.searchParams.set("store_passwd", config.storePassword);
  url.searchParams.set("format", "json");

  const response = await fetchGatewayJson(url.toString());
  const elements = Array.isArray(response.element) ? (response.element as GatewayJson[]) : [];

  if (!elements.length) {
    return response;
  }

  if (valId) {
    const matchedByValidationId = elements.find((element) => text(element.val_id) === valId);

    if (matchedByValidationId) {
      return matchedByValidationId;
    }
  }

  return (
    elements.find((element) => ["VALID", "VALIDATED"].includes(text(element.status).toUpperCase())) ??
    elements.find((element) => text(element.status).toUpperCase() === "FAILED") ??
    elements[0]
  );
}

function gatewayAmountMatches(order: OrderRow, response: GatewayJson) {
  const amount = parseMoney(response.currency_amount) ?? parseMoney(response.amount);
  const currency = (text(response.currency_type) || text(response.currency)).toUpperCase();

  return amount !== null && sameMoney(amount, order.total_amount) && currency === BDT;
}

function gatewayIdentityMatches(order: OrderRow, response: GatewayJson) {
  return text(response.tran_id) === order.order_number;
}

function isRisky(response: GatewayJson) {
  return text(response.risk_level) === "1";
}

function mapGatewayStatus(response: GatewayJson): PaymentStatus | "pending" | "unknown" {
  const status = text(response.status).toUpperCase();

  if (status === "VALID" || status === "VALIDATED") {
    return isRisky(response) ? "pending" : "paid";
  }

  if (status === "FAILED" || status === "INVALID_TRANSACTION") {
    return "failed";
  }

  if (status === "CANCELLED" || status === "CANCELED" || status === "CANCEL") {
    return "cancelled";
  }

  if (status === "PENDING") {
    return "pending";
  }

  return "unknown";
}

async function applyVerifiedPaymentStatus(
  supabase: SupabaseServiceClient,
  context: PaymentContext,
  nextStatus: PaymentStatus,
  source: NotificationSource,
  gatewayPayload: GatewayPayload,
  validationResponse: GatewayJson
) {
  if (context.payment.payment_status === "paid" && nextStatus !== "paid") {
    await logPaymentEvent(supabase, context.payment.id, "sslcommerz.status_downgrade_ignored", {
      order_number: context.order.order_number,
      current_status: context.payment.payment_status,
      attempted_status: nextStatus,
      source,
      gateway_payload: gatewayPayload,
      validation_response: validationResponse
    });
    return;
  }

  const paidAt = nextStatus === "paid" ? currentTimestamp() : context.payment.paid_at;
  const gatewayTransactionId =
    text(validationResponse.bank_tran_id) || text(gatewayPayload.bank_tran_id) || context.order.order_number;

  const paymentUpdate: Database["public"]["Tables"]["payments"]["Update"] = {
    gateway_name: PROVIDER_NAME,
    gateway_transaction_id: gatewayTransactionId,
    payment_method: text(validationResponse.card_type) || PROVIDER_NAME,
    payment_status: nextStatus,
    gateway_response: asJson({
      provider: PROVIDER_NAME,
      mode: getMode(),
      event: source,
      gateway_payload: gatewayPayload,
      validation_response: validationResponse,
      updated_at: currentTimestamp()
    }),
    paid_at: paidAt
  };

  const { error: paymentError } = await supabase.from("payments").update(paymentUpdate).eq("id", context.payment.id);

  if (paymentError) {
    throw new Error(`Could not update payment row: ${paymentError.message}`);
  }

  const { error: orderError } = await supabase
    .from("orders")
    .update({ payment_status: nextStatus })
    .eq("id", context.order.id);

  if (orderError) {
    throw new Error(`Could not update order payment status: ${orderError.message}`);
  }

  await logPaymentEvent(supabase, context.payment.id, "sslcommerz.status_updated", {
    order_number: context.order.order_number,
    payment_status: nextStatus,
    source,
    gateway_payload: gatewayPayload,
    validation_response: validationResponse
  });
}

export async function handleSslcommerzNotification(
  gatewayPayload: GatewayPayload,
  source: NotificationSource
): Promise<SslcommerzNotificationResult> {
  const orderNumber = text(gatewayPayload.tran_id);

  if (!orderNumber) {
    return {
      orderNumber: null,
      paymentStatus: "unknown",
      customerRedirect: "failed",
      message: "SSLCommerz callback did not include an order transaction id."
    };
  }

  const supabase = createSupabaseServiceClient();
  const context = await loadPaymentContextByOrderNumber(supabase, orderNumber);

  if (!context) {
    return {
      orderNumber,
      paymentStatus: "unknown",
      customerRedirect: "failed",
      message: "Payment callback did not match a local order."
    };
  }

  await logPaymentEvent(supabase, context.payment.id, `sslcommerz.${source}.received`, {
    order_number: orderNumber,
    gateway_payload: gatewayPayload
  });

  try {
    const valId = text(gatewayPayload.val_id);
    const validationResponse = valId
      ? await validateByValidationId(valId)
      : await queryByTransactionId(orderNumber, valId || undefined);

    await logPaymentEvent(supabase, context.payment.id, "sslcommerz.validation_response", {
      order_number: orderNumber,
      source,
      validation_response: validationResponse
    });

    if (!gatewayIdentityMatches(context.order, validationResponse) || !gatewayAmountMatches(context.order, validationResponse)) {
      await logPaymentEvent(supabase, context.payment.id, "sslcommerz.validation_rejected", {
        order_number: orderNumber,
        source,
        gateway_payload: gatewayPayload,
        validation_response: validationResponse,
        expected_amount: context.order.total_amount,
        expected_currency: BDT
      });

      return {
        orderNumber,
        paymentStatus: context.payment.payment_status,
        customerRedirect: "failed",
        message: "Payment validation failed for amount, currency, or transaction id."
      };
    }

    const nextStatus = mapGatewayStatus(validationResponse);

    if (nextStatus === "unknown") {
      return {
        orderNumber,
        paymentStatus: context.payment.payment_status,
        customerRedirect: "failed",
        message: "SSLCommerz returned an unknown payment status."
      };
    }

    if (nextStatus === "pending") {
      await logPaymentEvent(supabase, context.payment.id, "sslcommerz.payment_left_pending", {
        order_number: orderNumber,
        source,
        gateway_payload: gatewayPayload,
        validation_response: validationResponse
      });

      return {
        orderNumber,
        paymentStatus: "pending",
        customerRedirect: source === "success" ? "success" : "failed",
        message: isRisky(validationResponse)
          ? "Payment is marked risky by SSLCommerz and needs admin review."
          : "Payment is still pending."
      };
    }

    await applyVerifiedPaymentStatus(supabase, context, nextStatus, source, gatewayPayload, validationResponse);

    return {
      orderNumber,
      paymentStatus: nextStatus,
      customerRedirect: nextStatus === "paid" ? "success" : "failed",
      message: nextStatus === "paid" ? "Payment verified." : `Payment marked as ${nextStatus}.`
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not validate SSLCommerz payment.";

    await logPaymentEvent(supabase, context.payment.id, "sslcommerz.validation_error", {
      order_number: orderNumber,
      source,
      gateway_payload: gatewayPayload,
      message
    });

    return {
      orderNumber,
      paymentStatus: context.payment.payment_status,
      customerRedirect: source === "success" ? "success" : "failed",
      message
    };
  }
}
