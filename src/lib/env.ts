// Env values pasted into dashboards or written by Windows tools can carry an
// invisible BOM/zero-width character. Those break HTTP headers built from the
// value ("Cannot convert argument to a ByteString"), so every env read that
// feeds a URL, header, or credential must go through cleanEnv.
export function cleanEnv(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const cleaned = value.replace(/[\u{FEFF}\u{200B}-\u{200D}\u{2060}\u{00A0}]/gu, "").trim();
  return cleaned.length ? cleaned : undefined;
}
