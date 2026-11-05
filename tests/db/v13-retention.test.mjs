import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { applyMigrationFile, applyRollbackFile, createTestDatabase } from "../support/database.mjs";

// V13 (R9.2): every retention rule from the privacy policy, its limits, and its safety.
let db;
const q = (sql, params) => db.query(sql, params);
const one = async (sql, params) => (await q(sql, params)).rows[0];
const count = async (sql, params) => (await one(sql, params)).n;
const runChecks = async (file) => (await db.exec(await readFile(`db/checks/${file}`, "utf8"))).at(-1).rows;
const failing = (rows) => rows.filter((r) => r.ok !== true).map((r) => `${r.check_name}: ${r.detail}`);
const adminId = randomUUID();
const ids = {};

async function order(ageSql) {
  const productId = ids.product;
  const row = await one(
    `select * from create_checkout_order('Test customer','01712345678','Dhaka','House 1 Dhaka','note','cash-on-delivery',$1::jsonb,$2::uuid,null)`,
    [JSON.stringify([{ product_id: productId, quantity: 1 }]), randomUUID()]
  );
  await q(`update orders set created_at = now() - interval '${ageSql}' where id=$1`, [row.order_id]);
  await q(`update checkout_requests set created_at = now() - interval '${ageSql}' where order_id=$1`, [row.order_id]);
  return row.order_id;
}

before(async () => {
  db = await createTestDatabase({ maxVersion: 12 });
  await q("insert into admin_users(user_id,email,role) values($1,'v13@example.invalid','owner')", [adminId]);
  ids.product = randomUUID();
  await q("insert into products(id,name,slug,price,stock_quantity,is_active) values($1::uuid,'Retention test',$1::text,100,100,true)", [ids.product]);
  ids.soon = randomUUID();
  await q("insert into products(id,name,slug,price,stock_quantity,is_active,availability) values($1::uuid,'Coming soon',$1::text,100,0,true,'coming_soon')", [ids.soon]);
  const interest = async (phone, created, contacted) => {
    const id = randomUUID();
    await q(`insert into interest_requests(id,product_id,phone,created_at,contacted_at,status) values($1,$2,$3,now() - interval '${created}',${contacted ? `now() - interval '${contacted}'` : "null"},$4)`,
      [id, ids.soon, phone, contacted ? "contacted" : "new"]);
    return id;
  };
  ids.contactedOld = await interest("01711111111", "40 days", "31 days");
  ids.contactedRecent = await interest("01711111112", "40 days", "29 days");
  ids.expired = await interest("01711111113", "7 months", null);
  ids.fresh = await interest("01711111114", "1 month", null);
  const sub = async (phone, consent, response, optedOut) => {
    await q(`insert into whatsapp_subscribers(phone,consent_version,consent_at,last_response_at,opted_out_at) values($1,'v1',now() - interval '${consent}',${response ? `now() - interval '${response}'` : "null"},${optedOut ? `now() - interval '${optedOut}'` : "null"})`, [phone]);
  };
  await sub("01811111111", "13 months", null, null);       // silent for 12+ months -> delete
  await sub("01811111112", "2 years", "2 months", null);    // answered recently -> keep
  await sub("01811111113", "3 years", null, "2 years");     // opted out -> keep the record
  await sub("01811111114", "1 month", null, null);          // new -> keep
  ids.orderNew = await order("1 day");
  ids.orderTwoYears = await order("2 years 1 day");
  ids.orderSixYears = await order("6 years 1 day");
});
after(() => db.close());

test("the precheck passes on the V12 database and the postcheck is not yet satisfied", async () => {
  assert.deepEqual(failing(await runChecks("V13-precheck.sql")), []);
  assert.ok(failing(await runChecks("V13-postcheck.sql")).length > 0);
});

test("after V13 the postcheck passes and the precheck flags it as applied", async () => {
  await applyMigrationFile(db, "V13__data_retention.sql");
  assert.deepEqual(failing(await runChecks("V13-postcheck.sql")), []);
  assert.ok(failing(await runChecks("V13-precheck.sql")).some((line) => line.startsWith("05")));
});

test("only the service role can run it", async () => {
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    try {
      await assert.rejects(q("select * from run_data_retention('admin')"), role);
    } finally {
      await db.exec("reset role");
    }
  }
  await assert.rejects(q("select * from run_data_retention('cron')"), /Invalid retention trigger/);
});

test("one run applies every rule exactly as the privacy policy says", async () => {
  const items = await count("select count(*)::int as n from order_items where order_id=$1", [ids.orderSixYears]);
  assert.equal(items, 1);
  await db.exec("set role service_role");
  let results;
  try {
    results = Object.fromEntries((await q("select * from run_data_retention('schedule')")).rows.map((r) => [r.rule, r.affected]));
  } finally {
    await db.exec("reset role");
  }
  assert.deepEqual(results, {
    interest_contacted: 1, interest_expired: 1, whatsapp_inactive: 1,
    checkout_requests: 2, orders_deleted: 1, orders_anonymized: 1
  });

  const interestLeft = (await q("select id from interest_requests order by created_at")).rows.map((r) => r.id).sort();
  assert.deepEqual(interestLeft, [ids.contactedRecent, ids.fresh].sort());
  const phones = (await q("select phone from whatsapp_subscribers order by phone")).rows.map((r) => r.phone);
  assert.deepEqual(phones, ["01811111112", "01811111113", "01811111114"]);

  // Six years: the whole order is gone, with its items, payments and checkout copy.
  assert.equal(await count("select count(*)::int as n from orders where id=$1", [ids.orderSixYears]), 0);
  assert.equal(await count("select count(*)::int as n from order_items where order_id=$1", [ids.orderSixYears]), 0);
  assert.equal(await count("select count(*)::int as n from payments where order_id=$1", [ids.orderSixYears]), 0);

  // Two years: personal fields removed, accounting fields untouched.
  const old = await one("select * from orders where id=$1", [ids.orderTwoYears]);
  assert.equal(old.customer_name, "[মুছে ফেলা]");
  assert.equal(old.customer_address, "[মুছে ফেলা]");
  assert.equal(old.customer_note, null);
  assert.equal(old.customer_phone, "********678");
  assert.equal(Number(old.total_amount), 160);
  assert.equal(old.customer_district, "Dhaka");
  assert.ok(old.order_number);

  // Recent order: untouched.
  const recent = await one("select customer_name, customer_phone from orders where id=$1", [ids.orderNew]);
  assert.deepEqual(recent, { customer_name: "Test customer", customer_phone: "01712345678" });
  assert.equal(await count("select count(*)::int as n from checkout_requests where order_id=$1", [ids.orderNew]), 1);

  const run = await one("select run_trigger, results from data_retention_runs order by ran_at desc limit 1");
  assert.equal(run.run_trigger, "schedule");
  assert.equal(run.results.orders_anonymized, 1);
});

test("a second run changes nothing", async () => {
  await db.exec("set role service_role");
  try {
    const rows = (await q("select * from run_data_retention('admin')")).rows;
    assert.ok(rows.every((r) => r.affected === 0), JSON.stringify(rows));
  } finally {
    await db.exec("reset role");
  }
  assert.equal(await count("select count(*)::int as n from data_retention_runs"), 2);
});

test("admins can read the run history; other signed-in users and the public cannot", async () => {
  await q("select set_config('request.jwt.claim.sub',$1,false)", [adminId]);
  await db.exec("set role authenticated");
  try {
    assert.equal(await count("select count(*)::int as n from data_retention_runs"), 2);
    await q("select set_config('request.jwt.claim.sub',$1,false)", [randomUUID()]);
    assert.equal(await count("select count(*)::int as n from data_retention_runs"), 0);
    await assert.rejects(q("insert into data_retention_runs(run_trigger,results) values('admin','{}')"));
  } finally {
    await db.exec("reset role");
    await q("select set_config('request.jwt.claim.sub','',false)");
  }
  await db.exec("set role anon");
  try {
    await assert.rejects(q("select * from data_retention_runs"));
  } finally {
    await db.exec("reset role");
  }
});

test("the rollback removes the mechanism, and the precheck passes again", async () => {
  await applyRollbackFile(db, "V13-rollback.sql");
  assert.equal((await one("select to_regclass('public.data_retention_runs') as t")).t, null);
  assert.deepEqual(failing(await runChecks("V13-precheck.sql")), []);
  await applyRollbackFile(db, "V13-rollback.sql");
  await applyMigrationFile(db, "V13__data_retention.sql");
  assert.deepEqual(failing(await runChecks("V13-postcheck.sql")), []);
});
