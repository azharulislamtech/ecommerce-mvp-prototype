import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CONSENT_TEXTS, CURRENT_CONSENT_TEXT, CURRENT_CONSENT_VERSION, WHATSAPP_MESSAGES } from "../../src/lib/whatsapp";

// R9.1: the consent text a person agrees to is versioned and matches what the database accepts.
test("the current consent version exists and fits the database rule", () => {
  assert.equal(CURRENT_CONSENT_TEXT, CONSENT_TEXTS[CURRENT_CONSENT_VERSION]);
  for (const version of Object.keys(CONSENT_TEXTS)) assert.match(version, /^[A-Za-z0-9._-]{1,40}$/);
});

test("the consent text states the frequency and how to stop", () => {
  assert.match(CURRENT_CONSENT_TEXT, /মাসে সর্বোচ্চ ২–৪টি মেসেজ/);
  assert.match(CURRENT_CONSENT_TEXT, /"বন্ধ" লিখে থামাতে পারব/);
});

test("the consent text and the privacy policy promise the same thing", () => {
  const policy = readFileSync("src/app/(store)/privacy-policy/page.tsx", "utf8");
  // What is sent, how often, and the stop word must agree in both places.
  for (const phrase of ["নতুন পণ্য আর স্টকের খবর", "মাসে সর্বোচ্চ ২–৪"]) {
    assert.ok(CURRENT_CONSENT_TEXT.includes(phrase), `consent: ${phrase}`);
    assert.ok(policy.includes(phrase), `policy: ${phrase}`);
  }
  assert.ok(policy.includes("&ldquo;বন্ধ&rdquo; লিখুন"), "policy: stop word");
  assert.ok(CURRENT_CONSENT_TEXT.includes('"বন্ধ" লিখে'), "consent: stop word");
});

test("the thank-you does not claim a re-subscription the form cannot do", () => {
  assert.match(WHATSAPP_MESSAGES.thanks, /আগে কখনো বন্ধ করে থাকলে/);
});
