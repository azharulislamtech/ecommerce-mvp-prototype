import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDescription } from "../../src/lib/product-description";

// R6.2: descriptions written with the guideline templates become sections.
const home = `কোন সমস্যা মেটায়
সবজি কাটতে প্রতিদিন অনেক সময় চলে যায়।

কীভাবে মেটায়
- পাঁচ রকম ব্লেড
- হাত কাটার ভয় নেই

কীভাবে ব্যবহার করবেন
১. সবজি রাখুন
২. ঢাকনা চাপুন
৩. ধুয়ে রাখুন

প্যাকেটে যা আছে: কাটার, ৫টা ব্লেড
মাপ: ২০ × ১০ সেমি
ওজন: ৪৫০ গ্রাম

জানা সীমাবদ্ধতা
- খুব শক্ত সবজিতে ধীরে কাটে

ডেলিভারি ও ফেরত
- ঢাকায় ২–৩ দিন
ফেরতের শর্ত: রিটার্ন নীতি অনুযায়ী

সাধারণ প্রশ্ন
প্রশ্ন: ডিশওয়াশারে দেওয়া যাবে?
উত্তর: না, হাতে ধুয়ে নিন।
ব্লেড আলাদা কেনা যায়?
এখনো না।`;

test("the Home template becomes headed sections, steps, facts and FAQ", () => {
  const parsed = parseDescription(home);
  assert.equal(parsed.structured, true);
  assert.deepEqual(parsed.sections.map((s) => s.heading), ["কোন সমস্যা মেটায়", "কীভাবে মেটায়", "কীভাবে ব্যবহার করবেন", "জানা সীমাবদ্ধতা", "ডেলিভারি ও ফেরত", "সাধারণ প্রশ্ন"]);
  assert.deepEqual(parsed.sections[0].paragraphs, ["সবজি কাটতে প্রতিদিন অনেক সময় চলে যায়।"]);
  assert.deepEqual(parsed.sections[1].bullets, ["পাঁচ রকম ব্লেড", "হাত কাটার ভয় নেই"]);
  assert.deepEqual(parsed.sections[2].steps, ["সবজি রাখুন", "ঢাকনা চাপুন", "ধুয়ে রাখুন"]);
  assert.deepEqual(parsed.facts.map((f) => f.label), ["প্যাকেটে যা আছে", "মাপ", "ওজন"]);
  // A colon line under delivery stays in that section, not in the facts table.
  assert.deepEqual(parsed.sections[4].paragraphs, ["ফেরতের শর্ত: রিটার্ন নীতি অনুযায়ী"]);
  assert.deepEqual(parsed.sections[5].faqs, [
    { question: "ডিশওয়াশারে দেওয়া যাবে?", answer: "না, হাতে ধুয়ে নিন।" },
    { question: "ব্লেড আলাদা কেনা যায়?", answer: "এখনো না।" }
  ]);
});

test("the Kids template headings and facts are recognised", () => {
  const parsed = parseDescription("এই পণ্য কী\nকাঠের অক্ষর পাজল।\n\nকী শেখায়\n- বাংলা অক্ষর\n\nবয়সসীমা: ৩ বছর ও তার বেশি\n\nনিরাপত্তা:\n- বড়দের তত্ত্বাবধানে খেলুন");
  assert.deepEqual(parsed.sections.map((s) => s.heading), ["এই পণ্য কী", "কী শেখায়", "নিরাপত্তা"]);
  assert.deepEqual(parsed.facts, [{ label: "বয়সসীমা", value: "৩ বছর ও তার বেশি" }]);
});

test("plain or English text is kept as paragraphs, in order, nothing lost", () => {
  const legacy = "Clear calls, compact case, and all-day comfort.\nWorks with phones and laptops. Charge it overnight.";
  const parsed = parseDescription(legacy);
  assert.equal(parsed.structured, false);
  assert.deepEqual(parsed.sections.flatMap((s) => s.paragraphs), legacy.split("\n"));
  assert.deepEqual(parsed.facts, []);
  // A sentence with a colon is not mistaken for a fact.
  assert.deepEqual(parseDescription("নোট করুন: এই পণ্যটি ছোট শিশুর জন্য নয়, কারণ এতে ছোট অংশ আছে এবং গিলে ফেলতে পারে।").facts, []);
  assert.deepEqual(parseDescription("").sections, []);
});

test("an unanswered last question is shown as text, not dropped", () => {
  const parsed = parseDescription("সাধারণ প্রশ্ন\nরং কি উঠে যায়?");
  assert.deepEqual(parsed.sections[0].faqs, []);
  assert.deepEqual(parsed.sections[0].paragraphs, ["রং কি উঠে যায়?"]);
});
