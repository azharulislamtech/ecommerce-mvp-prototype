import "server-only";

import { cleanEnv } from "@/lib/env";
import { initiateSslcommerzPayment, isSslcommerzConfigured } from "./sslcommerz";

export type CheckoutPaymentMethod = "cash-on-delivery" | "sslcommerz";

export type PaymentInitiationResult =
  | {
      ok: true;
      redirectUrl: string;
    }
  | {
      ok: false;
      message: string;
    };

export function normalizeCheckoutPaymentMethod(value: string): CheckoutPaymentMethod | null {
  const normalized = value.trim().toLowerCase();

  if (!normalized || normalized === "cash-on-delivery" || normalized === "cod") {
    return "cash-on-delivery";
  }

  if (normalized === "sslcommerz" || normalized === "payment-gateway") {
    return "sslcommerz";
  }

  return null;
}

export function isOnlineCheckoutEnabled() {
  return cleanEnv(process.env.ENABLE_ONLINE_PAYMENTS) === "true";
}

export function isOnlinePaymentMethod(method: CheckoutPaymentMethod) {
  return method === "sslcommerz";
}

export function getPaymentConfigError(method: CheckoutPaymentMethod) {
  if (method === "sslcommerz" && !isOnlineCheckoutEnabled()) {
    return "Online payment is temporarily unavailable. Choose Cash on Delivery.";
  }

  if (method === "sslcommerz" && !isSslcommerzConfigured()) {
    return "SSLCommerz is not configured yet. Choose Cash on Delivery or add gateway credentials.";
  }

  return null;
}

export async function initiateOnlinePaymentForOrder(
  orderId: string,
  method: CheckoutPaymentMethod,
  appBaseUrl: string
): Promise<PaymentInitiationResult> {
  switch (method) {
    case "sslcommerz":
      return initiateSslcommerzPayment({ orderId, appBaseUrl });
    case "cash-on-delivery":
      return {
        ok: false,
        message: "Cash on Delivery does not need online payment initiation."
      };
    default:
      return {
        ok: false,
        message: "Unsupported payment method."
      };
  }
}
