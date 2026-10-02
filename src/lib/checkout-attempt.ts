export const CHECKOUT_ATTEMPT_STORAGE_KEY = "kenasathi-checkout-attempt";

// Store only a digest and random key, never customer form fields.
export async function checkoutFingerprint(formData: FormData) {
  const entries = [...formData.entries()].filter(([name]) => name !== "idempotency_key")
    .map(([name, value]) => [name, String(value)]).sort(([a], [b]) => a.localeCompare(b));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(entries)));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function checkoutAttempt(fingerprint: string, saved: string | null) {
  try {
    const previous = JSON.parse(saved ?? "null");
    if (previous?.fingerprint === fingerprint && /^[0-9a-f-]{36}$/i.test(previous.key)) return previous as { fingerprint: string; key: string };
  } catch { /* A broken browser storage entry must not break checkout. */ }
  return { fingerprint, key: crypto.randomUUID() };
}
