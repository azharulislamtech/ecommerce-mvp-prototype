import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
// @ts-expect-error -- plain .mjs test helper without types
import { createTestDatabase } from "../support/database.mjs";
import {
  availabilityWrite,
  comingSoonStockError,
  extrasColumns,
  groupCategoryOptions,
  parseProductExtras,
  parseTagList,
  willGoOnSale
} from "../../src/lib/admin/product-fields";

// R10.1: admin form fields from V11.
const form = (values: Record<string, string>) => (name: string) => values[name] ?? "";

test("empty extras parse to safe defaults", () => {
  const { extras, errors } = parseProductExtras(form({}));
  assert.deepEqual(errors, {});
  assert.deepEqual(extras, {
    availability: "available", estimatedPrice: null, ageMinMonths: null, ageMaxMonths: null,
    problemTags: [], learningGoals: [], videoUrl: null
  });
});

test("tags are trimmed, lowercased, hyphenated and de-duplicated", () => {
  assert.deepEqual(parseTagList(" Kitchen Storage, small-space,kitchen-storage,\n"), ["kitchen-storage", "small-space"]);
  assert.match(parseProductExtras(form({ problem_tags: "রান্নাঘর" })).errors.problem_tags ?? "", /not valid/);
  const eleven = Array.from({ length: 11 }, (_, i) => `t${i}`).join(",");
  assert.match(parseProductExtras(form({ learning_goals: eleven })).errors.learning_goals ?? "", /at most 10/);
});

test("age, estimated price and video link follow the V11 constraints", () => {
  assert.equal(parseProductExtras(form({ age_min_months: "36", age_max_months: "72" })).extras.ageMaxMonths, 72);
  assert.ok(parseProductExtras(form({ age_min_months: "72", age_max_months: "36" })).errors.age_max_months);
  assert.ok(parseProductExtras(form({ age_min_months: "217" })).errors.age_min_months);
  assert.ok(parseProductExtras(form({ age_min_months: "2.5" })).errors.age_min_months);
  assert.ok(parseProductExtras(form({ estimated_price: "-1" })).errors.estimated_price);
  assert.equal(parseProductExtras(form({ estimated_price: "1250" })).extras.estimatedPrice, 1250);
  for (const ok of ["https://www.youtube.com/watch?v=abc_123", "https://youtu.be/abc", "https://www.youtube.com/shorts/abc", "https://fb.watch/abc/", "https://www.facebook.com/kenasathi/videos/123"]) {
    assert.equal(parseProductExtras(form({ video_url: ok })).errors.video_url, undefined, ok);
  }
  for (const bad of ["http://youtu.be/abc", "https://vimeo.com/1", "https://youtu.be/<script>", "https://evil.com/?youtu.be/x"]) {
    assert.ok(parseProductExtras(form({ video_url: bad })).errors.video_url, bad);
  }
});

test("coming soon needs stock 0, except adding stock to an existing coming-soon product", () => {
  assert.equal(comingSoonStockError("coming_soon", 0, null), undefined);
  assert.ok(comingSoonStockError("coming_soon", 5, null));
  assert.ok(comingSoonStockError("coming_soon", 5, "available"));
  assert.equal(comingSoonStockError("coming_soon", 5, "coming_soon"), undefined);
  assert.equal(willGoOnSale("coming_soon", 5, "coming_soon"), true);
  assert.equal(willGoOnSale("available", 5, "available"), false);
});

test("availability is written on insert, and on update only when it changes", () => {
  assert.deepEqual(availabilityWrite("available", null), { availability: "available" });
  assert.deepEqual(availabilityWrite("coming_soon", "coming_soon"), {});
  assert.deepEqual(availabilityWrite("coming_soon", "available"), { availability: "coming_soon" });
});

test("categories are grouped by section and section roots cannot be chosen", () => {
  const groups = groupCategoryOptions([
    { id: "k", name: "Kids & Baby", is_active: false, section: "kids", parent_id: null },
    { id: "ke", name: "শিশুদের শিক্ষা", is_active: false, section: "kids", parent_id: "k" },
    { id: "h", name: "সংসারের সমাধান", is_active: true, section: "home", parent_id: null },
    { id: "hk", name: "রান্নাঘর", is_active: true, section: "home", parent_id: "h" },
    { id: "old", name: "Electronics", is_active: true, section: null, parent_id: null }
  ]);
  assert.deepEqual(groups.map((g) => g.label), ["Kids & Baby", "সংসারের সমাধান · Home Solutions", "Other categories"]);
  assert.deepEqual(groups[0].options.map((o) => [o.id, o.disabled]), [["k", true], ["ke", false]]);
  assert.equal(groups[0].options[1].label, "Kids & Baby › শিশুদের শিক্ষা (inactive)");
  assert.equal(groups[1].options[1].label, "সংসারের সমাধান › রান্নাঘর");
  assert.deepEqual(groups[2].options, [{ id: "old", label: "Electronics", disabled: false }]);
});

// The same column writes the server action sends, run against the real V11 schema.
type Db = { query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>; close: () => Promise<void> };
let db: Db;
before(async () => { db = await createTestDatabase(); });
after(() => db.close());

async function insertProduct(values: Record<string, string>, stock: number) {
  const id = randomUUID();
  const cols = extrasColumns(parseProductExtras(form(values)).extras, null);
  await db.query(
    `insert into products(id,name,slug,price,stock_quantity,availability,estimated_price,age_min_months,age_max_months,problem_tags,learning_goals,video_url)
     values($1,'R10 product',$2,100,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [id, `r10-${id}`, stock, cols.availability, cols.estimated_price, cols.age_min_months, cols.age_max_months, cols.problem_tags, cols.learning_goals, cols.video_url]
  );
  return id;
}

async function updateProduct(id: string, values: Record<string, string>, stock: number) {
  const previous = (await db.query("select availability from products where id=$1", [id])).rows[0].availability as "available" | "coming_soon";
  const cols: Record<string, unknown> = { stock_quantity: stock, ...extrasColumns(parseProductExtras(form(values)).extras, previous) };
  const names = Object.keys(cols);
  await db.query(`update products set ${names.map((n, i) => `${n}=$${i + 2}`).join(",")} where id=$1`, [id, ...names.map((n) => cols[n])]);
  return (await db.query("select availability,stock_quantity,first_stocked_at,problem_tags,video_url from products where id=$1", [id])).rows[0];
}

test("database accepts the form's writes for a full coming-soon listing", async () => {
  const id = await insertProduct({
    availability: "coming_soon", estimated_price: "1200", age_min_months: "36", age_max_months: "72",
    problem_tags: "small-space", learning_goals: "bangla-letters", video_url: "https://youtu.be/abc"
  }, 0);
  const row = (await db.query("select * from products where id=$1", [id])).rows[0];
  assert.equal(row.availability, "coming_soon");
  assert.equal(Number(row.estimated_price), 1200);
  assert.deepEqual(row.learning_goals, ["bangla-letters"]);
  assert.equal(row.first_stocked_at, null);
});

test("adding stock to a coming-soon product puts it on sale (availability left out)", async () => {
  const id = await insertProduct({ availability: "coming_soon" }, 0);
  const row = await updateProduct(id, { availability: "coming_soon" }, 5);
  assert.equal(row.availability, "available");
  assert.equal(row.stock_quantity, 5);
  assert.ok(row.first_stocked_at);
});

test("sending an unchanged coming_soon with stock would be refused, which is why the form leaves it out", async () => {
  const id = await insertProduct({ availability: "coming_soon" }, 0);
  await assert.rejects(db.query("update products set availability='coming_soon', stock_quantity=5 where id=$1", [id]), /coming-soon product cannot have stock/i);
});

test("switching an available product to coming soon with stock 0 works, and back again", async () => {
  const id = await insertProduct({}, 0);
  assert.equal((await updateProduct(id, { availability: "coming_soon" }, 0)).availability, "coming_soon");
  assert.equal((await updateProduct(id, { availability: "available" }, 0)).availability, "available");
});
