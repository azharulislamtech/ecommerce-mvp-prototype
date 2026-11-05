import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { INTEREST_MESSAGES, INTEREST_NOTICE } from "../../src/lib/order-copy";

// R7.1: the interest notice must be the guideline's exact sentence (common §৩.৩).
test("the interest notice is word for word the guideline's sentence", () => {
  const guideline = readFileSync("docs/product-guideline-common.md", "utf8");
  assert.ok(guideline.includes(`> ${INTEREST_NOTICE}\n`));
});

test("no interest message promises an order, a price or a date", () => {
  for (const text of [INTEREST_NOTICE, ...Object.values(INTEREST_MESSAGES)]) {
    assert.doesNotMatch(text, /অর্ডার নিশ্চিত|প্রি-অর্ডার|pre-?order|অগ্রিম|তারিখে আসবে/i, text);
  }
  assert.match(INTEREST_MESSAGES.thanks, /কোনো টাকা দিতে হবে না/);
});
