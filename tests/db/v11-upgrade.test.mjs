import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { applyMigrationFile, createTestDatabase } from "../support/database.mjs";

// Upgrade path: an order placed on the V10 schema must replay unchanged after V11.
let db;
before(async () => {
  db = await createTestDatabase({ maxVersion: 10 });
});
after(() => db.close());

test("a checkout request stored before V11 replays to its original order after V11", async () => {
  const productId = randomUUID();
  await db.query(`insert into products(id,name,slug,price,stock_quantity,is_active) values($1::uuid,'Legacy',$2,100,5,true)`, [productId, productId]);
  const key = randomUUID();
  const call = () => db.query(
    `select * from create_checkout_order('Test customer','01711111111','Dhaka','Test address Dhaka','','cash-on-delivery',$1::jsonb,$2::uuid,null)`,
    [JSON.stringify([{ product_id: productId, quantity: 2 }]), key],
  ).then((r) => r.rows[0]);

  const before = await call();
  assert.equal(before.replayed, false);
  assert.equal((await db.query("select count(*)::int as n from checkout_requests")).rows[0].n, 1);

  await applyMigrationFile(db, "V11__redesign_catalog_schema.sql");
  const product = (await db.query("select stock_quantity, availability, first_stocked_at from products where id=$1", [productId])).rows[0];
  assert.equal(product.stock_quantity, 3);
  assert.equal(product.availability, "available");
  assert.equal(product.first_stocked_at, null, "legacy row is not inferred as stocked");

  // Even after the product leaves stock, the replay returns the stored order.
  await db.query("update products set stock_quantity=0 where id=$1", [productId]);
  const replay = await call();
  assert.equal(replay.replayed, true);
  assert.equal(replay.order_id, before.order_id);
  assert.equal(Number(replay.total_amount), Number(before.total_amount));
  assert.equal((await db.query("select stock_quantity from products where id=$1", [productId])).rows[0].stock_quantity, 0);
  assert.equal((await db.query("select count(*)::int as n from orders")).rows[0].n, 1);

  // A new request for the same product is rejected by the V11 state check.
  await assert.rejects(
    db.query(`select * from create_checkout_order('Test customer','01711111112','Dhaka','Test address Dhaka','','cash-on-delivery',$1::jsonb,$2::uuid,null)`,
      [JSON.stringify([{ product_id: productId, quantity: 1 }]), randomUUID()]),
    /no longer available/,
  );
});
