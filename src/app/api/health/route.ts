import { createSupabaseServiceClient, hasSupabaseServiceConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  let ready = false;
  try {
    if (hasSupabaseServiceConfig()) {
      const { error } = await createSupabaseServiceClient().from("orders")
        .select("id,stock_released", { head: true }).limit(0).abortSignal(AbortSignal.timeout(3000));
      ready = !error;
    }
  } catch { /* A health probe exposes no database details. */ }
  return Response.json({ status: ready ? "ok" : "unavailable" }, {
    status: ready ? 200 : 503,
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }
  });
}
