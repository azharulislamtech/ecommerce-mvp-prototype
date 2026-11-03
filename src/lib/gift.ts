// R8.1: free "send as gift" checkbox. No database or RPC change: the choice is stored as a
// fixed first line in orders.customer_note, so the admin and the packer can see it.
export const GIFT_CHECKBOX_LABEL = "উপহার হিসেবে পাঠান (প্যাকেটে দামের কাগজ থাকবে না)";
export const GIFT_NOTE_LINE = "[উপহার] প্যাকেটে দামের কাগজ বা রসিদ দেবেন না";

export function composeOrderNote(note: string, sendAsGift: boolean) {
  const trimmed = note.trim();
  if (!sendAsGift) return trimmed;
  return trimmed ? `${GIFT_NOTE_LINE}\n${trimmed}` : GIFT_NOTE_LINE;
}

export function splitGiftNote(stored: string | null | undefined) {
  const value = (stored ?? "").trim();
  if (value === GIFT_NOTE_LINE) return { isGift: true, note: "" };
  if (value.startsWith(`${GIFT_NOTE_LINE}\n`)) return { isGift: true, note: value.slice(GIFT_NOTE_LINE.length + 1).trim() };
  return { isGift: false, note: value };
}
