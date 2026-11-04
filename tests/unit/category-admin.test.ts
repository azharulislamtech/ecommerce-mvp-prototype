import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCategoryGroups, canToggleCategory } from "../../src/lib/admin/category-admin";

// R10.3: the admin categories page groups, counts and warnings.
const cat = (id: string, slug: string, section: "kids" | "home" | null, parent: string | null, active: boolean) =>
  ({ id, name: slug, slug, section, parent_id: parent, is_active: active });
const product = (category: string, over: Partial<{ is_active: boolean; availability: "available" | "coming_soon"; stock_quantity: number; first_stocked_at: string | null }> = {}) =>
  ({ category_id: category, is_active: true, availability: "available" as const, stock_quantity: 3, first_stocked_at: "2026-11-01", ...over });

const categories = [
  cat("k", "kids-baby", "kids", null, false),
  cat("ke", "kids-education", "kids", "k", true),
  cat("h", "home-solutions", "home", null, false),
  cat("hk", "home-kitchen", "home", "h", false),
  cat("old", "electronics", null, null, false)
];

test("groups are Kids, Home and read-only legacy, roots before their children", () => {
  const groups = buildCategoryGroups(categories, []);
  assert.deepEqual(groups.map((g) => g.key), ["kids", "home", "legacy"]);
  assert.deepEqual(groups[0].rows.map((r) => r.slug), ["kids-baby", "kids-education"]);
  assert.equal(groups[2].rows[0].editable, false);
  assert.ok(groups[0].rows.every((r) => r.editable));
});

test("counts use the storefront state, and a section root counts its sub-categories", () => {
  const groups = buildCategoryGroups(categories, [
    product("ke"),
    product("ke", { stock_quantity: 0, first_stocked_at: null, availability: "coming_soon" }),
    product("ke", { stock_quantity: 0 }),
    product("ke", { is_active: false })
  ]);
  const [root, child] = groups[0].rows;
  assert.deepEqual([child.inStock, child.comingSoon], [1, 1]);
  assert.deepEqual([root.inStock, root.comingSoon], [1, 1]);
});

test("warnings explain empty, orphaned and inconsistent states", () => {
  const groups = buildCategoryGroups(categories, []);
  const [kidsRoot, kidsChild] = groups[0].rows;
  assert.ok(kidsChild.warnings.some((w) => w.startsWith("Active with no in-stock products")));
  assert.ok(kidsChild.warnings.includes('Its section "kids-baby" is inactive.'));
  assert.ok(kidsRoot.warnings.includes("Some sub-categories are active while this section is inactive."));
  assert.ok(groups[1].rows[1].warnings.some((w) => w.startsWith("No in-stock products yet")));
  assert.deepEqual(groups[2].rows[0].warnings, []);
});

test("only new-section categories can be switched", () => {
  assert.equal(canToggleCategory({ section: "kids" }), true);
  assert.equal(canToggleCategory({ section: null }), false);
  assert.equal(canToggleCategory(null), false);
});
