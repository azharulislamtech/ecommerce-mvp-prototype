import { NextRequest } from "next/server";
import { handleSslcommerzCustomerReturn } from "@/lib/payments/sslcommerz-routes";

export async function GET(request: NextRequest) {
  return handleSslcommerzCustomerReturn(request, "cancel");
}

export async function POST(request: NextRequest) {
  return handleSslcommerzCustomerReturn(request, "cancel");
}
