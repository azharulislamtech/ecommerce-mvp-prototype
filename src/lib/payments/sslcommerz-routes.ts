import "server-only";

import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { handleSslcommerzNotification } from "./sslcommerz";

type CallbackSource = "success" | "fail" | "cancel";

export async function readSslcommerzPayload(request: NextRequest) {
  const payload: Record<string, string> = {};

  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    payload[key] = value;
  }

  if (request.method === "GET") {
    return payload;
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    if (body) {
      for (const [key, value] of Object.entries(body)) {
        payload[key] = typeof value === "string" || typeof value === "number" ? String(value) : "";
      }
    }

    return payload;
  }

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return payload;
  }

  for (const [key, value] of formData.entries()) {
    payload[key] = typeof value === "string" ? value : value.name;
  }

  return payload;
}

function revalidatePaymentViews(orderNumber: string | null) {
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/payment/success");
  revalidatePath("/track-order");

  if (orderNumber) {
    revalidatePath(`/admin/orders/${orderNumber}`);
  }
}

export async function handleSslcommerzCustomerReturn(request: NextRequest, source: CallbackSource) {
  const payload = await readSslcommerzPayload(request);
  const result = await handleSslcommerzNotification(payload, source);

  revalidatePaymentViews(result.orderNumber);

  const isSuccess = result.customerRedirect === "success";
  const path = isSuccess ? "/payment/success" : "/payment/failed";
  const redirectUrl = new URL(path, request.url);

  if (isSuccess) {
    // The success page resolves the order from the tracking token; the failed
    // page only echoes the order number back for support calls.
    if (result.trackingToken) {
      redirectUrl.searchParams.set("t", result.trackingToken);
    }
  } else if (result.orderNumber) {
    redirectUrl.searchParams.set("order", result.orderNumber);
  }

  redirectUrl.searchParams.set("status", result.paymentStatus);
  redirectUrl.searchParams.set("reason", result.message);

  return NextResponse.redirect(redirectUrl, 303);
}

export async function handleSslcommerzIpn(request: NextRequest) {
  const payload = await readSslcommerzPayload(request);
  const result = await handleSslcommerzNotification(payload, "ipn");

  revalidatePaymentViews(result.orderNumber);

  return NextResponse.json({
    received: true,
    order: result.orderNumber,
    payment_status: result.paymentStatus,
    message: result.message
  });
}
