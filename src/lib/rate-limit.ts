import "server-only";

import { headers } from "next/headers";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

// Defence in depth rather than the primary control: order numbers are random as
// of V8, so guessing one is already infeasible. That buys room to keep the
// ceiling generous, which matters because Bangladeshi mobile carriers put many
// customers behind one NAT address. Only failures are counted, so a customer
// reading their own order never spends budget however often they refresh.
const FAILURE_LIMIT = 30;
const FAILURE_WINDOW_SECONDS = 10 * 60;

export const RATE_LIMIT_WINDOW_MINUTES = FAILURE_WINDOW_SECONDS / 60;

async function getClientIp() {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const firstForwarded = forwardedFor?.split(",")[0]?.trim();

  return firstForwarded || requestHeaders.get("x-real-ip")?.trim() || "unknown";
}

async function bucketKey(scope: string) {
  return `${scope}:${await getClientIp()}`;
}

export async function isWithinLookupRateLimit(scope: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("is_within_public_rate_limit", {
    p_key: await bucketKey(scope),
    p_limit: FAILURE_LIMIT,
    p_window_seconds: FAILURE_WINDOW_SECONDS
  });

  if (error) {
    // Fail open: a throttling outage must not take order tracking offline.
    console.error("Rate limit check failed:", error.message);
    return true;
  }

  return data !== false;
}

export async function recordLookupFailure(scope: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.rpc("record_public_rate_limit_hit", {
    p_key: await bucketKey(scope),
    p_window_seconds: FAILURE_WINDOW_SECONDS
  });

  if (error) {
    console.error("Rate limit record failed:", error.message);
  }
}
