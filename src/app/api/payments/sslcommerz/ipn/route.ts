import { NextRequest } from "next/server";
import { handleSslcommerzIpn } from "@/lib/payments/sslcommerz-routes";

export async function POST(request: NextRequest) {
  return handleSslcommerzIpn(request);
}
