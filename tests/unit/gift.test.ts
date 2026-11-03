import { test } from "node:test";
import assert from "node:assert/strict";
import { GIFT_NOTE_LINE, composeOrderNote, splitGiftNote } from "../../src/lib/gift";

test("gift choice becomes a fixed first line of the order note", () => {
  assert.equal(composeOrderNote("", false), "");
  assert.equal(composeOrderNote("  বিকেলে আসবেন ", false), "বিকেলে আসবেন");
  assert.equal(composeOrderNote("", true), GIFT_NOTE_LINE);
  assert.equal(composeOrderNote("বিকেলে আসবেন", true), `${GIFT_NOTE_LINE}\nবিকেলে আসবেন`);
});

test("the admin view splits the gift line from the customer's note", () => {
  assert.deepEqual(splitGiftNote(null), { isGift: false, note: "" });
  assert.deepEqual(splitGiftNote("বিকেলে আসবেন"), { isGift: false, note: "বিকেলে আসবেন" });
  assert.deepEqual(splitGiftNote(GIFT_NOTE_LINE), { isGift: true, note: "" });
  assert.deepEqual(splitGiftNote(composeOrderNote("বিকেলে আসবেন", true)), { isGift: true, note: "বিকেলে আসবেন" });
  // The line only counts at the start, so a customer quoting it later is not a gift order.
  assert.equal(splitGiftNote(`হ্যালো ${GIFT_NOTE_LINE}`).isGift, false);
});
