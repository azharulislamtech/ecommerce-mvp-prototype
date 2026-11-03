import { after, before, test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error -- plain .mjs test helper without types
import { createTestDatabase } from "../support/database.mjs";
import { ageLabel, canBuy, storefrontState, type StateInput } from "../../src/lib/storefront-state";
import { productStructuredData } from "../../src/lib/seo";
import type { Product } from "../../src/lib/data";

// R2.3 / R2.4: the four storefront states and what Google sees for each.
type Db = { query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>; close: () => Promise<void> };
let db: Db;
before(async () => { db = await createTestDatabase(); });
after(() => db.close());

const cases: [StateInput, string][] = [
  [{ isActive: false, availability: "available", stock: 5, firstStockedAt: "2026-11-01" }, "hidden"],
  [{ isActive: false, availability: "coming_soon", stock: 0, firstStockedAt: null }, "hidden"],
  [{ isActive: true, availability: "coming_soon", stock: 0, firstStockedAt: null }, "coming_soon"],
  [{ isActive: true, availability: "coming_soon", stock: 0, firstStockedAt: "2026-11-01" }, "coming_soon"],
  [{ isActive: true, availability: "available", stock: 3, firstStockedAt: null }, "in_stock"],
  [{ isActive: true, availability: "available", stock: 3, firstStockedAt: "2026-11-01" }, "in_stock"],
  [{ isActive: true, availability: "available", stock: 0, firstStockedAt: "2026-11-01" }, "stock_ended"],
  [{ isActive: true, availability: "available", stock: 0, firstStockedAt: null }, "hidden"]
];

test("the site's state rule matches the database function storefront_state() on every case", async () => {
  for (const [input, expected] of cases) {
    assert.equal(storefrontState(input), expected, JSON.stringify(input));
    const { rows } = await db.query("select storefront_state($1,$2,$3,$4::timestamptz) as state", [
      input.isActive, input.availability, input.stock, input.firstStockedAt
    ]);
    assert.equal(rows[0].state, expected, `database: ${JSON.stringify(input)}`);
  }
});

test("a product never stocked can never show stock ended, and only in stock can be bought", () => {
  assert.notEqual(storefrontState({ isActive: true, availability: "available", stock: 0, firstStockedAt: null }), "stock_ended");
  assert.equal(canBuy("in_stock"), true);
  for (const state of ["stock_ended", "coming_soon", "hidden"] as const) assert.equal(canBuy(state), false);
});

test("age badges read naturally in Bangla", () => {
  assert.equal(ageLabel(36, 72), "বয়স ৩–৬ বছর");
  assert.equal(ageLabel(6, 18), "বয়স ৬ মাস – ১৮ মাস");
  assert.equal(ageLabel(24, null), "বয়স ২ বছর+");
  assert.equal(ageLabel(null, 12), "বয়স ১ বছর পর্যন্ত");
  assert.equal(ageLabel(null, undefined), null);
});

const base = { id: "id", slug: "puzzle", name: "Puzzle", category: "শিশুদের শিক্ষা", shortDescription: "s", description: "d", price: 650, stock: 4, featured: false, visual: "accessories", specs: [] } as const;

test("JSON-LD offers follow the state: price + InStock, price + OutOfStock, or no offer", () => {
  const site = "https://kenasathi.com";
  const inStock = productStructuredData({ ...base, state: "in_stock" } as Product, site);
  assert.equal(inStock.offers?.availability, "https://schema.org/InStock");
  assert.equal(inStock.offers?.price, "650.00");
  assert.equal(inStock.offers?.priceCurrency, "BDT");

  const ended = productStructuredData({ ...base, stock: 0, state: "stock_ended" } as Product, site);
  assert.equal(ended.offers?.availability, "https://schema.org/OutOfStock");
  assert.equal(ended.offers?.price, "650.00");

  const soon = productStructuredData({ ...base, stock: 0, state: "coming_soon", estimatedPrice: 700 } as Product, site);
  assert.equal("offers" in soon, false);
  assert.doesNotMatch(JSON.stringify(soon), /650|700|price/i);
});
