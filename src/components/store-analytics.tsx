"use client";

import { Analytics } from "@vercel/analytics/next";
import { publicAnalyticsUrl } from "@/lib/analytics-privacy";

export function StoreAnalytics() {
  if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== "true") return null;
  return <Analytics beforeSend={(event) => {
    const url = publicAnalyticsUrl(event.url);
    return url ? { ...event, url } : null;
  }} />;
}
