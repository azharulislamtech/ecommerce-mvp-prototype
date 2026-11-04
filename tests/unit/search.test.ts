import { test } from "node:test";
import assert from "node:assert/strict";
import type { Product } from "../../src/lib/data";
import { normalizeSearch, searchProducts } from "../../src/lib/search";

// R2.10: Bangla and English search.
const product = (over: Partial<Product>): Product =>
  ({ id: over.slug ?? "x", slug: "x", name: "x", category: "General", shortDescription: "", description: "", price: 500, stock: 3, featured: false, visual: "accessories", specs: [], state: "in_stock", ...over }) as Product;

const puzzle = product({ slug: "puzzle", name: "অক্ষর মেলাও পাজল", category: "শিশুদের শিক্ষা", section: "kids", learningGoals: ["letters-words"] });
const cutter = product({ slug: "cutter", name: "Multi Vegetable Cutter", category: "রান্নাঘর", section: "home", problemTags: ["kitchen-clutter"] });
const rack = product({ slug: "rack", name: "মসলার র‍্যাক", category: "রান্নাঘর", section: "home", shortDescription: "ছোট রান্নাঘরে জায়গা বাঁচায়" });
const all = [puzzle, cutter, rack];
const slugs = (query: string) => searchProducts(all, query).map((p) => p.slug);

test("Bangla and English words find the same product", () => {
  assert.deepEqual(slugs("পাজল"), ["puzzle"]);
  assert.deepEqual(slugs("puzzle"), ["puzzle"]);
  assert.deepEqual(slugs("PUZZLE"), ["puzzle"]);
  assert.deepEqual(slugs("cutter"), ["cutter"]);
  assert.deepEqual(slugs("কাটার"), ["cutter"]);
  assert.deepEqual(slugs("rack"), ["rack"]);
});

test("section, category, problem and learning goal words are searchable", () => {
  assert.deepEqual(slugs("kitchen").sort(), ["cutter", "rack"]);
  assert.deepEqual(slugs("রান্নাঘর গোছানো"), ["cutter"]);
  assert.deepEqual(slugs("অক্ষর ও শব্দ"), ["puzzle"]);
  assert.deepEqual(slugs("letters"), ["puzzle"]);
  assert.deepEqual(slugs("kids"), ["puzzle"]);
  assert.deepEqual(slugs("সংসারের সমাধান").sort(), ["cutter", "rack"]);
});

test("every word must match, name matches rank first, and nonsense finds nothing", () => {
  assert.deepEqual(slugs("puzzle kitchen"), []);
  assert.deepEqual(slugs("xyzzy"), []);
  // Both mention রান্নাঘর; the rack has it only in its description, the cutter only in its category.
  const ranked = searchProducts([product({ slug: "a", name: "Box", category: "রান্নাঘর" }), product({ slug: "b", name: "রান্নাঘরের তাক" })], "রান্নাঘর").map((p) => p.slug);
  assert.deepEqual(ranked, ["b", "a"]);
  assert.equal(searchProducts(all, "  ").length, 3);
});

test("search text is normalised: case, punctuation and spacing", () => {
  assert.equal(normalizeSearch("  Multi-Vegetable,  CUTTER! "), "multi vegetable cutter");
  assert.equal(normalizeSearch("অক্ষর—মেলাও"), "অক্ষর মেলাও");
});
