import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { applyMigrationFile, applyRollbackFile, createTestDatabase } from "../support/database.mjs";

// V12 (R1.8): hide the legacy demo catalog, touch nothing real, keep old orders, roll back
// exactly. The database is shaped like production on V11 plus the cases V12 must handle.
let db;
const LEGACY = ["electronics", "fashion", "home-living", "beauty", "accessories"];
const id = () => randomUUID();
const ids = {};
const q = (sql, params) => db.query(sql, params);
const one = async (sql, params) => (await q(sql, params)).rows[0];
const active = async (table, rowId) => (await one(`select is_active from ${table} where id=$1`, [rowId])).is_active;
const run = async (file) => (await db.exec(await readFile(`db/checks/${file}`, "utf8"))).at(-1).rows;
const failing = (rows) => rows.filter((r) => r.ok !== true).map((r) => `${r.check_name}: ${r.detail}`);
const checkout = (productId) =>
  q(`select * from create_checkout_order('Test customer','01711111111','Dhaka','Test address Dhaka','','cash-on-delivery',$1::jsonb,$2::uuid,null)`,
    [JSON.stringify([{ product_id: productId, quantity: 1 }]), id()]);

before(async () => {
  db = await createTestDatabase({ maxVersion: 11 });
  const cat = async (slug) => (await one("select id from categories where slug=$1", [slug])).id;
  ids.electronics = await cat("electronics");
  ids.fashion = await cat("fashion");
  ids.kitchen = await cat("home-kitchen");
  // An active never-stocked dummy (as on the e2e fixture) and an already-inactive dummy
  // (as in production, where the owner switched them off in the admin).
  ids.activeDummy = id();
  await q("insert into products(id,name,slug,price,stock_quantity,is_active,category_id) values($1::uuid,'Active dummy',$1::text,100,0,true,$2)", [ids.activeDummy, ids.electronics]);
  ids.inactiveDummy = id();
  await q("insert into products(id,name,slug,price,stock_quantity,is_active,category_id) values($1::uuid,'Inactive dummy',$1::text,100,0,false,$2)", [ids.inactiveDummy, ids.fashion]);
  // A product in a new section is never V12's business.
  ids.sectionProduct = id();
  await q("insert into products(id,name,slug,price,stock_quantity,is_active,category_id) values($1::uuid,'Kitchen rack',$1::text,500,5,true,$2)", [ids.sectionProduct, ids.kitchen]);
  // An old order that references a legacy seed product must survive.
  ids.seed = (await one("select id from products where slug='aurora-wireless-earbuds'")).id;
  ids.order = (await checkout(ids.seed)).rows[0].order_id;
});
after(() => db.close());

test("the precheck passes on the V11 database and changes nothing", async () => {
  const before = await one("select count(*)::int as n, count(*) filter (where is_active)::int as a from products");
  assert.deepEqual(failing(await run("V12-precheck.sql")), []);
  assert.deepEqual(await one("select count(*)::int as n, count(*) filter (where is_active)::int as a from products"), before);
});

test("V12 hides the legacy categories and never-stocked products, nothing else", async () => {
  await applyMigrationFile(db, "V12__hide_legacy_demo_catalog.sql");
  const legacy = (await q("select slug, is_active from categories where slug = any($1)", [LEGACY])).rows;
  assert.equal(legacy.length, 5);
  assert.ok(legacy.every((c) => c.is_active === false));
  assert.equal(await active("products", ids.activeDummy), false);
  assert.equal(await active("products", ids.seed), false);
  assert.equal(await active("products", ids.inactiveDummy), false);
  assert.equal(await active("products", ids.sectionProduct), true);
  // The launch categories keep their seeded (inactive) state; V12 does not switch them on.
  const launch = (await q("select is_active from categories where section is not null")).rows;
  assert.equal(launch.length, 6);
  assert.ok(launch.every((c) => c.is_active === false));
  // Only rows that actually changed are logged: the already-inactive dummy is not.
  const logged = (await q("select row_id from v12_catalog_cutover_log where table_name='products'")).rows.map((r) => r.row_id);
  assert.ok(logged.includes(ids.activeDummy));
  assert.ok(!logged.includes(ids.inactiveDummy));
  assert.ok(!logged.includes(ids.sectionProduct));
  assert.deepEqual(failing(await run("V12-postcheck.sql")), []);
});

test("old orders keep their items and dummy products cannot be bought", async () => {
  const items = (await q("select product_id from order_items where order_id=$1", [ids.order])).rows;
  assert.deepEqual(items.map((r) => r.product_id), [ids.seed]);
  await assert.rejects(checkout(ids.activeDummy));
  // The public role no longer sees the legacy categories.
  await db.exec("set role anon");
  try {
    const visible = (await q("select slug from categories where slug = any($1)", [LEGACY])).rows;
    assert.deepEqual(visible, []);
    await assert.rejects(q("select * from v12_catalog_cutover_log"));
  } finally {
    await db.exec("reset role");
  }
});

test("running V12 twice changes nothing more", async () => {
  const before = (await one("select count(*)::int as n from v12_catalog_cutover_log")).n;
  await applyMigrationFile(db, "V12__hide_legacy_demo_catalog.sql");
  assert.equal((await one("select count(*)::int as n from v12_catalog_cutover_log")).n, before);
  assert.deepEqual(failing(await run("V12-postcheck.sql")), []);
});

test("the rollback restores exactly what V12 changed, and the precheck passes again", async () => {
  await applyRollbackFile(db, "V12-rollback.sql");
  const legacy = (await q("select is_active from categories where slug = any($1)", [LEGACY])).rows;
  assert.ok(legacy.every((c) => c.is_active === true));
  assert.equal(await active("products", ids.activeDummy), true);
  assert.equal(await active("products", ids.seed), true);
  // Already inactive before V12, so it stays inactive.
  assert.equal(await active("products", ids.inactiveDummy), false);
  assert.equal(await active("products", ids.sectionProduct), true);
  assert.equal((await one("select to_regclass('public.v12_catalog_cutover_log') as t")).t, null);
  assert.deepEqual(failing(await run("V12-precheck.sql")), []);
  // A second rollback is a harmless no-op, and V12 can be applied again.
  await applyRollbackFile(db, "V12-rollback.sql");
  await applyMigrationFile(db, "V12__hide_legacy_demo_catalog.sql");
  assert.deepEqual(failing(await run("V12-postcheck.sql")), []);
});

test("a real (once stocked) product in a legacy category stops the precheck and is never hidden", async () => {
  const fresh = await createTestDatabase({ maxVersion: 11 });
  try {
    const cat = (await fresh.query("select id from categories where slug='beauty'")).rows[0].id;
    const real = id();
    // Inserted with stock, so the V11 trigger sets first_stocked_at: it really was in stock.
    await fresh.query("insert into products(id,name,slug,price,stock_quantity,is_active,category_id) values($1::uuid,'Real serum',$1::text,900,4,true,$2)", [real, cat]);
    const rows = (await fresh.exec(await readFile("db/checks/V12-precheck.sql", "utf8"))).at(-1).rows;
    assert.ok(rows.some((r) => r.check_name.startsWith("07") && r.ok === false));
    await applyMigrationFile(fresh, "V12__hide_legacy_demo_catalog.sql");
    assert.equal((await fresh.query("select is_active from products where id=$1", [real])).rows[0].is_active, true);
  } finally {
    await fresh.close();
  }
});
