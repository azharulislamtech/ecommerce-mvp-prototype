import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOrderAlert } from "../../src/lib/notifications/order-alert";

test("the Telegram order alert carries no customer personal data", () => {
  const text = buildOrderAlert({
    orderNumber: "KS-20261103-0001",
    totalAmount: 1560,
    itemCount: 2,
    paymentMethod: "cod",
    district: "Dhaka",
    siteUrl: "https://kenasathi.com/"
  });
  assert.match(text, /KS-20261103-0001/);
  assert.match(text, /৳1,560/);
  assert.match(text, /District: Dhaka/);
  assert.match(text, /https:\/\/kenasathi\.com\/admin\/orders\/KS-20261103-0001/);
  assert.doesNotMatch(text, /BDT/);
  for (const label of ["Customer", "Phone", "Address", "Note"]) {
    assert.doesNotMatch(text, new RegExp(label, "i"));
  }
  // No phone-number-like digits beyond the order number and amount.
  assert.doesNotMatch(text, /01[3-9]\d{8}/);
});

test("the admin link encodes the order number", () => {
  const text = buildOrderAlert({ orderNumber: "A B/1", totalAmount: 60, itemCount: 1, paymentMethod: "cod", district: "Dhaka", siteUrl: "https://kenasathi.com" });
  assert.match(text, /\/admin\/orders\/A%20B%2F1$/);
});
