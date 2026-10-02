export function publicAnalyticsUrl(value: string) {
  try {
    const url = new URL(value);
    if (/^\/(admin|api|cart|checkout|track-order|payment)(\/|$)/.test(url.pathname)) return null;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch { return null; }
}
