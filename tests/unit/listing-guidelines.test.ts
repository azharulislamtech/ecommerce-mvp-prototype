import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COMMON_CHECKLIST, SECTION_CHECKLIST, checklistFor, listingWarnings, type ListingDraft } from "../../src/lib/admin/listing-guidelines";

// R10.2: the checklist is a copy of the guideline files; this keeps the copy honest.
test("every checklist line appears word for word in its guideline file", () => {
  for (const group of [...COMMON_CHECKLIST, ...Object.values(SECTION_CHECKLIST)]) {
    const file = readFileSync(group.source.split(" ")[0], "utf8");
    for (const item of group.items) {
      assert.ok(file.includes(`- [ ] ${item}\n`), `${group.source}: ${item}`);
    }
  }
});

test("the section checklist follows the chosen category's section", () => {
  assert.equal(checklistFor(null).length, COMMON_CHECKLIST.length);
  assert.equal(checklistFor("kids").at(-1)?.title, "শিশুদের শিক্ষা");
  assert.equal(checklistFor("home").at(-1)?.title, "সংসারের সমাধান");
});

const base: ListingDraft = {
  name: "অক্ষর পাজল", shortDescription: "বাংলা অক্ষর চেনার কাঠের পাজল", description: "৩–৬ বছরের শিশুর জন্য।",
  price: "650", discountPrice: "", availability: "available", stock: "10", estimatedPrice: "", problemTags: "", section: "kids"
};

test("a plain honest listing has no warnings", () => {
  assert.deepEqual(listingWarnings(base), []);
});

test("unproven claims are flagged in Bangla and English", () => {
  for (const claim of ["Non-Toxic paint", "নন-টক্সিক রং", "বিষমুক্ত রং", "CE certified", "সার্টিফাইড", "১০০% নিরাপদ", "100% guarantee", "জীবনভর চলবে", "মাত্র ২টা বাকি", "only 3 left"]) {
    const warnings = listingWarnings({ ...base, description: `ভালো পণ্য। ${claim}।` });
    assert.equal(warnings.length, 1, claim);
    assert.match(warnings[0], /প্রমাণ না থাকলে সরিয়ে দিন/, claim);
  }
  // Words that only look similar are not flagged.
  assert.deepEqual(listingWarnings({ ...base, description: "টক্সিক কিছু নেই বলে আমরা দাবি করি না; সার্টিফিকেট নেই।" }), []);
});

test("discount, estimated price and home tags get their own warnings", () => {
  assert.match(listingWarnings({ ...base, discountPrice: "550" }).join(), /বানানো "আগের দাম" নয়/);
  assert.equal(listingWarnings({ ...base, availability: "coming_soon", stock: "0", discountPrice: "550" }).length, 2);
  assert.match(listingWarnings({ ...base, estimatedPrice: "700" }).join(), /আনুমানিক দাম শুধু/);
  assert.deepEqual(listingWarnings({ ...base, availability: "coming_soon", stock: "0", estimatedPrice: "700" }), []);
  assert.match(listingWarnings({ ...base, section: "home" }).join(), /সমস্যা ট্যাগ/);
  assert.deepEqual(listingWarnings({ ...base, section: "home", problemTags: "small-space" }), []);
});
