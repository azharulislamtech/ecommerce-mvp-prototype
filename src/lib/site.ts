import { cleanEnv } from "@/lib/env";

export const DEFAULT_SITE_URL = "https://kenasathi.com";

export function getSiteUrl() {
  const configured = cleanEnv(process.env.NEXT_PUBLIC_SITE_URL) ?? cleanEnv(process.env.APP_BASE_URL);
  return (configured ?? DEFAULT_SITE_URL).replace(/\/+$/, "");
}
