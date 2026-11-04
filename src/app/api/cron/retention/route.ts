import { NextResponse } from "next/server";
import { cleanEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

// R9.2: the daily retention run (vercel.json "crons"). Vercel sends
// `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set in the project. Without the
// secret the route refuses to run, so a stranger can never trigger it. The response carries
// only counts, never personal data.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = cleanEnv(process.env.CRON_SECRET);
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await createSupabaseServiceClient().rpc("run_data_retention", { p_trigger: "schedule" });
  if (error) {
    console.error("Data retention run failed: " + error.message);
    return NextResponse.json({ ok: false, error: "Retention run failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, results: data });
}
