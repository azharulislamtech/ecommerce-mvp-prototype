import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { applyMigrationFile, createTestDatabase } from "../support/database.mjs";

// The pre/post check scripts must be read-only and report ok=true on a database
// shaped like production (V10, ten inactive dummy products, five old categories).
let db;
const run = async (file) => {
  const sql = await readFile(`db/checks/${file}`, "utf8");
  const results = await db.exec(sql);
  return results.at(-1).rows;
};
const failing = (rows) => rows.filter((r) => r.ok !== true).map((r) => `${r.check_name}: ${r.detail}`);

before(async () => {
  db = await createTestDatabase({ maxVersion: 10 });
  const existing = (await db.query("select count(*)::int as n from products")).rows[0].n;
  for (let i = existing; i < 10; i++) {
    const id = randomUUID();
    await db.query("insert into products(id,name,slug,price,stock_quantity) values($1::uuid,'Dummy',$2,100,5)", [id, id]);
  }
  await db.query("update products set is_active=false");
  for (const slug of ["electronics", "fashion", "home-living", "beauty", "accessories"]) {
    await db.query("insert into categories(name,slug) values($1,$1) on conflict (slug) do nothing", [slug]);
  }
});
after(() => db.close());

test("precheck passes on a production-shaped V10 database and changes nothing", async () => {
  const before = (await db.query("select count(*)::int as n from products")).rows[0].n;
  const rows = await run("V11-precheck.sql");
  assert.ok(rows.length >= 16);
  assert.deepEqual(failing(rows), []);
  assert.equal((await db.query("select count(*)::int as n from products")).rows[0].n, before);
});

test("after V11 the precheck flags the new objects and the postcheck passes", async () => {
  await applyMigrationFile(db, "V11__redesign_catalog_schema.sql");
  const pre = failing(await run("V11-precheck.sql"));
  for (const name of ["03", "04", "05", "06", "07", "16"]) {
    assert.ok(pre.some((line) => line.startsWith(name)), `precheck ${name} should now fail`);
  }
  assert.deepEqual(failing(await run("V11-postcheck.sql")), []);
});
