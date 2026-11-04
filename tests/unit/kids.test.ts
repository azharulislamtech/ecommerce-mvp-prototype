import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Product } from "../../src/lib/data";
import { AGE_BUCKETS, LEARNING_GOALS, fitsAge, kidsPageData, learningLine } from "../../src/lib/kids";

// R4.1: Kids page age buttons and learning tiles.
const product = (over: Partial<Product>): Product =>
  ({ id: Math.random().toString(), slug: "p", name: "p", category: "শিশুদের শিক্ষা", shortDescription: "s", description: "d", price: 500, stock: 3, featured: false, visual: "accessories", specs: [], state: "in_stock", section: "kids", ...over }) as Product;

test("every learning goal tag and tile title is written in the Kids guideline", () => {
  const text = readFileSync("docs/kids-education-product-guideline.md", "utf8");
  assert.equal(LEARNING_GOALS.length, 4);
  for (const goal of LEARNING_GOALS) {
    assert.match(goal.tag, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(text.includes(`| \`${goal.tag}\` | ${goal.title} |`), goal.tag);
  }
});

test("a product fits an age button when its range overlaps that year", () => {
  const threeToSix = product({ ageMinMonths: 36, ageMaxMonths: 72 });
  assert.deepEqual(AGE_BUCKETS.map((b) => fitsAge(threeToSix, b.key)), [true, true, true]);
  const fourToFive = product({ ageMinMonths: 48, ageMaxMonths: 60 });
  assert.deepEqual(AGE_BUCKETS.map((b) => fitsAge(fourToFive, b.key)), [false, true, false]);
  assert.deepEqual(AGE_BUCKETS.map((b) => fitsAge(product({ ageMinMonths: 36, ageMaxMonths: 48 }), b.key)), [true, false, false]);
  const fromFive = product({ ageMinMonths: 60 });
  assert.deepEqual(AGE_BUCKETS.map((b) => fitsAge(fromFive, b.key)), [false, false, true]);
  // No age set: not placed in any age button.
  assert.deepEqual(AGE_BUCKETS.map((b) => fitsAge(product({}), b.key)), [false, false, false]);
  assert.equal(fitsAge(product({}), "unknown"), true);
});

test("only ages and tiles with in-stock products appear, with real counts", () => {
  const data = kidsPageData([
    product({ ageMinMonths: 36, ageMaxMonths: 48, learningGoals: ["letters-words"] }),
    product({ ageMinMonths: 36, ageMaxMonths: 48, learningGoals: ["letters-words", "numbers-counting"] }),
    product({ state: "stock_ended", stock: 0, ageMinMonths: 60, ageMaxMonths: 72, learningGoals: ["drawing-colors"] }),
    product({ state: "coming_soon", stock: 0, ageMinMonths: 60, ageMaxMonths: 72, learningGoals: ["hand-skills"] })
  ]);
  assert.deepEqual(data.ages.map((a) => a.key), ["3-4"]);
  assert.deepEqual(data.goals.map((g) => [g.tag, g.count]), [["letters-words", 2], ["numbers-counting", 1]]);
  assert.equal(data.comingSoon.length, 1);
  assert.equal(data.inStock.length, 2);
});

test("the card learning line lists known goals in Bangla", () => {
  assert.equal(learningLine(["numbers-counting", "letters-words", "other"]), "অক্ষর ও শব্দ, সংখ্যা ও গণনা");
  assert.equal(learningLine([]), null);
});
