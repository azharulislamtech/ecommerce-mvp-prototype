import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMoney } from "../../src/lib/data";
import { districtLabel, districtLabels, districtOptions, districts } from "../../src/lib/delivery";

test("prices show the taka sign with South Asian grouping", () => {
  assert.equal(formatMoney(60), "৳60");
  assert.equal(formatMoney(1500), "৳1,500");
  assert.equal(formatMoney(150000), "৳1,50,000");
  assert.equal(formatMoney(-60), "-৳60");
  assert.doesNotMatch(formatMoney(60), /BDT/);
});

test("every district has a Bangla label and the options keep English values", () => {
  assert.equal(districts.length, 64);
  for (const district of districts) {
    assert.match(districtLabels[district], /^[ঀ-৿ ]+$/, district);
  }
  assert.equal(new Set(Object.values(districtLabels)).size, 64);
  assert.equal(districtOptions.length, 64);
  assert.deepEqual(districtOptions[0], { value: "Dhaka", label: "ঢাকা" });
  assert.deepEqual(new Set(districtOptions.map((o) => o.value)), new Set(districts));
  assert.equal(districtLabel("chattogram"), "চট্টগ্রাম");
  assert.equal(districtLabel("Unknown"), "Unknown");
});
