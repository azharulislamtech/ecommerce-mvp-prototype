import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkoutErrorMessage,
  formatBanglaDate,
  itemCountLabel,
  orderStatusLabel,
  paymentStatusLabel
} from "../../src/lib/order-copy";

test("database checkout errors map to safe Bangla messages", () => {
  assert.match(checkoutErrorMessage("Too many orders. Please wait 15 minutes or contact support."), /১৫ মিনিট/);
  assert.match(checkoutErrorMessage("Checkout details changed. Start a new checkout."), /রিফ্রেশ/);
  assert.match(checkoutErrorMessage("A product in your cart is no longer available."), /পাওয়া যাচ্ছে না/);
  assert.match(checkoutErrorMessage("Insufficient stock for Test product."), /স্টক নেই/);
  const unknown = checkoutErrorMessage('duplicate key value violates unique constraint "orders_pkey"');
  assert.match(unknown, /অর্ডার নেওয়া যায়নি/);
  assert.doesNotMatch(unknown, /constraint|orders_pkey/);
  assert.match(checkoutErrorMessage(undefined), /অর্ডার নেওয়া যায়নি/);
});

test("every order and payment status has a Bangla label", () => {
  for (const status of ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]) {
    assert.doesNotMatch(orderStatusLabel(status), /[a-z]/);
  }
  for (const status of ["pending", "paid", "failed", "cancelled", "refunded"]) {
    assert.doesNotMatch(paymentStatusLabel(status), /[a-z]/);
  }
  assert.equal(itemCountLabel(3), "3টি পণ্য");
});

test("dates are formatted in Bangla and invalid dates are skipped", () => {
  assert.ok(formatBanglaDate("2026-11-03T10:00:00Z"));
  assert.equal(formatBanglaDate("not a date"), null);
});
