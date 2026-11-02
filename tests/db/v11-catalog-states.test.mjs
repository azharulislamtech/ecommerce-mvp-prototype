import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createTestDatabase } from "../support/database.mjs";

let db;
const adminId = randomUUID();

before(async () => {
  db = await createTestDatabase();
  await db.query(`insert into admin_users(user_id,email,role) values($1,'v11@example.invalid','owner')`, [adminId]);
});
beforeEach(async () => {
  await db.exec("reset role; truncate orders cascade; truncate public_rate_limits; truncate interest_requests; truncate whatsapp_subscribers;");
  await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [adminId]);
});
after(() => db.close());

async function product({ stock = 10, active = true, availability = "available", slug = randomUUID() } = {}) {
  const id = randomUUID();
  await db.query(
    `insert into products(id,name,slug,price,stock_quantity,is_active,availability) values($1::uuid,'V11 product',$2,100,$3,$4,$5)`,
    [id, slug, stock, active, availability],
  );
  return id;
}
const row = async (id) => (await db.query("select * from products where id=$1", [id])).rows[0];
const checkout = (productId, { key = randomUUID(), quantity = 1 } = {}) =>
  db.query(`select * from create_checkout_order('Test customer','01711111111','Dhaka','Test address Dhaka','','cash-on-delivery',$1::jsonb,$2::uuid,null)`,
    [JSON.stringify([{ product_id: productId, quantity }]), key]).then((r) => r.rows[0]);
const asRole = async (role, fn) => { await db.exec(`set role ${role}`); try { return await fn(); } finally { await db.exec("reset role"); } };

// --- R1.1 / R1.2 categories ---------------------------------------------------------

test("launch categories are seeded inactive, two levels, legacy categories keep section NULL", async () => {
  const rows = (await db.query("select c.slug,c.is_active,c.section,p.slug as parent from categories c left join categories p on p.id=c.parent_id where c.section is not null order by c.slug")).rows;
  assert.deepEqual(rows.map((r) => [r.slug, r.parent, r.section, r.is_active]), [
    ["home-cleaning", "home-solutions", "home", false],
    ["home-kitchen", "home-solutions", "home", false],
    ["home-organizing", "home-solutions", "home", false],
    ["home-solutions", null, "home", false],
    ["kids-baby", null, "kids", false],
    ["kids-education", "kids-baby", "kids", false],
  ]);
  const legacy = (await db.query("select count(*)::int as n from categories where section is null and parent_id is null and slug in ('electronics','fashion','home-living','beauty','accessories')")).rows[0].n;
  assert.equal(legacy, 5);
});

test("category hierarchy rejects a third level, a section mismatch and a self parent", async () => {
  const child = (await db.query("select id from categories where slug='kids-education'")).rows[0].id;
  await assert.rejects(db.query("insert into categories(name,slug,section,parent_id) values('Too deep','too-deep','kids',$1)", [child]), /at most two levels/);
  const homeRoot = (await db.query("select id from categories where slug='home-solutions'")).rows[0].id;
  await assert.rejects(db.query("insert into categories(name,slug,section,parent_id) values('Wrong','wrong-section','kids',$1)", [homeRoot]), /same section/);
  await assert.rejects(db.query("update categories set parent_id=id where slug='kids-baby'"), /categories_not_own_parent|at most two levels|cannot itself/);
  const kidsRoot = (await db.query("select id from categories where slug='kids-baby'")).rows[0].id;
  await assert.rejects(db.query("update categories set parent_id=$1 where slug='home-solutions'", [kidsRoot]), /same section|cannot itself/);
});

// --- R1.3 availability, first_stocked_at, derived state ------------------------------

test("existing rows default to available; coming_soon with stock is rejected", async () => {
  // Rows that existed before V11 (the V3 seed, all with stock) get 'available' and a NULL
  // first_stocked_at: V11 never infers that a legacy product was really stocked.
  const seeded = (await db.query("select availability, first_stocked_at, stock_quantity from products where slug in ('aurora-wireless-earbuds','calm-ceramic-diffuser','luna-everyday-handbag','orbit-smart-watch','pure-glow-serum','softline-cotton-throw')")).rows;
  assert.equal(seeded.length, 6);
  for (const p of seeded) {
    assert.equal(p.availability, "available");
    assert.equal(p.first_stocked_at, null);
  }
  assert.ok(seeded.some((p) => p.stock_quantity > 0));
  await assert.rejects(product({ stock: 3, availability: "coming_soon" }), /products_coming_soon_has_no_stock/);
  const available = await product({ stock: 5 });
  await assert.rejects(db.query("update products set availability='coming_soon' where id=$1", [available]), /cannot have stock/);
  const soon = await product({ stock: 0, availability: "coming_soon" });
  await assert.rejects(db.query("update products set availability='sold_out' where id=$1", [soon]), /products_availability_valid/);
});

test("first_stocked_at is set once on the first 0 -> >0 change and never overwritten", async () => {
  const fresh = await product({ stock: 0 });
  assert.equal((await row(fresh)).first_stocked_at, null);
  await db.query("update products set stock_quantity=5 where id=$1", [fresh]);
  const first = (await row(fresh)).first_stocked_at;
  assert.ok(first);
  await db.query("update products set stock_quantity=0 where id=$1", [fresh]);
  await db.query("update products set stock_quantity=3 where id=$1", [fresh]);
  assert.equal((await row(fresh)).first_stocked_at.getTime(), first.getTime());
  await db.query("update products set first_stocked_at=now()+interval '1 day' where id=$1", [fresh]);
  assert.equal((await row(fresh)).first_stocked_at.getTime(), first.getTime());
  await db.query("update products set first_stocked_at=null where id=$1", [fresh]);
  assert.equal((await row(fresh)).first_stocked_at.getTime(), first.getTime());

  const insertedWithStock = await product({ stock: 4 });
  assert.ok((await row(insertedWithStock)).first_stocked_at);
});

test("legacy rows with stock but no date are never inferred as stocked", async () => {
  const id = await product({ stock: 0 });
  // Simulate a pre-V11 row: stock already above zero and first_stocked_at NULL.
  await db.exec("alter table products disable trigger track_product_stock_state");
  await db.query("update products set stock_quantity=8, first_stocked_at=null where id=$1", [id]);
  await db.exec("alter table products enable trigger track_product_stock_state");
  await db.query("update products set stock_quantity=9 where id=$1", [id]);
  assert.equal((await row(id)).first_stocked_at, null);
  await db.query("update products set stock_quantity=0 where id=$1", [id]);
  const state = (await db.query("select storefront_state(is_active,availability,stock_quantity,first_stocked_at) as s from products where id=$1", [id])).rows[0].s;
  assert.equal(state, "hidden");
});

test("storefront_state derives the five cases from one definition", async () => {
  const cases = [
    [false, "available", 5, "2026-01-01", "hidden"],
    [true, "coming_soon", 0, null, "coming_soon"],
    [true, "available", 5, null, "in_stock"],
    [true, "available", 0, "2026-01-01", "stock_ended"],
    [true, "available", 0, null, "hidden"],
  ];
  for (const [active, availability, stock, first, expected] of cases) {
    const s = (await db.query("select storefront_state($1,$2,$3,$4::timestamptz) as s", [active, availability, stock, first])).rows[0].s;
    assert.equal(s, expected, JSON.stringify([active, availability, stock, first]));
  }
});

test("cancelling an order for a coming_soon product returns it to available instead of failing", async () => {
  const id = await product({ stock: 2 });
  const order = await checkout(id, { quantity: 2 });
  await db.query("update products set availability='coming_soon' where id=$1", [id]);
  await db.query("select update_admin_order($1,'cancelled','pending')", [order.order_number]);
  const p = await row(id);
  assert.equal(p.stock_quantity, 2);
  assert.equal(p.availability, "available");
});

// --- R1.3 checkout -------------------------------------------------------------------

test("checkout rejects coming_soon and stock-ended products with the generic message", async () => {
  const soon = await product({ stock: 0, availability: "coming_soon" });
  await assert.rejects(checkout(soon), /no longer available/);
  const ended = await product({ stock: 1 });
  await checkout(ended);
  await assert.rejects(checkout(ended), /no longer available/);
  assert.equal((await db.query("select count(*)::int as n from orders")).rows[0].n, 1);
});

test("a replayed checkout still returns its original order after the product leaves stock", async () => {
  const id = await product({ stock: 2 });
  const key = randomUUID();
  const first = await checkout(id, { key, quantity: 2 });
  await db.query("update products set availability='coming_soon' where id=$1", [id]);
  const again = await checkout(id, { key, quantity: 2 });
  assert.equal(again.order_id, first.order_id);
  assert.equal(again.replayed, true);
});

test("internal checkout stays closed to every API role", async () => {
  for (const role of ["anon", "authenticated", "service_role"]) {
    await asRole(role, () => assert.rejects(
      db.query(`select * from create_checkout_order_internal('Test','01711111111','Dhaka','Test address','','cash-on-delivery','[]')`),
      /permission denied/,
    ));
  }
});

// --- R1.4 tags, age, video ----------------------------------------------------------

test("tags, age range and video links are validated", async () => {
  const id = await product();
  await db.query("update products set problem_tags='{kids-letters}', learning_goals='{letters,fine-motor}', age_min_months=36, age_max_months=72 where id=$1", [id]);
  await assert.rejects(db.query("update products set problem_tags='{Bad Tag}' where id=$1", [id]), /products_problem_tags_valid/);
  await assert.rejects(db.query("update products set age_min_months=72, age_max_months=36 where id=$1", [id]), /products_age_range_valid/);
  for (const ok of ["https://www.youtube.com/watch?v=abc123", "https://youtu.be/abc123", "https://www.facebook.com/kenasathi/videos/123", "https://fb.watch/abc"]) {
    await db.query("update products set video_url=$2 where id=$1", [id, ok]);
  }
  for (const bad of ["http://youtube.com/watch?v=x", "https://evil.example/video", "javascript:alert(1)", "https://youtu.be/<script>"]) {
    await assert.rejects(db.query("update products set video_url=$2 where id=$1", [id, bad]), /products_video_url_valid/, bad);
  }
});

// --- R1.5 interest requests ---------------------------------------------------------

const interest = (productId, phone = "01711111111", name = null, quantity = null, key = null) =>
  db.query("select submit_product_interest($1,$2,$3,$4,$5)", [productId, phone, name, quantity, key]);

test("interest: one row per product and phone, same success on repeat, trusted fields only", async () => {
  const id = await product({ stock: 0, availability: "coming_soon" });
  await interest(id, "01711111111", "  রহিম  ", 2);
  await interest(id, "+8801711111111", "Someone else", 5);
  const rows = (await db.query("select * from interest_requests")).rows;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].phone, "01711111111");
  assert.equal(rows[0].customer_name, "রহিম");
  assert.equal(rows[0].status, "new");
  assert.equal(rows[0].contacted_at, null);
  await interest(id, "01811111111");
  assert.equal((await db.query("select customer_name from interest_requests where phone='01811111111'")).rows[0].customer_name, null);
});

test("interest: only active coming_soon products; bad input rejected", async () => {
  const inStock = await product({ stock: 5 });
  await assert.rejects(interest(inStock), /not taking interest/);
  const hiddenSoon = await product({ stock: 0, availability: "coming_soon", active: false });
  await assert.rejects(interest(hiddenSoon), /not taking interest/);
  const soon = await product({ stock: 0, availability: "coming_soon" });
  await assert.rejects(interest(soon, "12345"), /valid Bangladesh mobile/);
  await assert.rejects(interest(soon, "01711111111", "x".repeat(81)), /too long/);
  await assert.rejects(interest(soon, "01711111111", null, 0), /Invalid quantity/);
  await assert.rejects(interest(soon, "01711111111", null, null, "not-a-key"), /Invalid request key/);
});

test("interest: per-phone and per-ip rate limits", async () => {
  const soon = await product({ stock: 0, availability: "coming_soon" });
  for (let i = 0; i < 10; i++) await interest(soon, "01911111111");
  await assert.rejects(interest(soon, "01911111111"), /Too many requests/);
  const key = "b".repeat(64);
  for (let i = 0; i < 30; i++) await interest(soon, "016" + String(i).padStart(8, "0"), null, null, key);
  await assert.rejects(interest(soon, "01511111111", null, null, key), /Too many requests/);
});

test("interest and WhatsApp tables are invisible to anon and non-admin users", async () => {
  const soon = await product({ stock: 0, availability: "coming_soon" });
  await interest(soon);
  await db.query("select subscribe_whatsapp_updates('01711111111','v1')");
  await asRole("anon", async () => {
    await assert.rejects(db.query("select * from interest_requests"), /permission denied/);
    await assert.rejects(db.query("select * from whatsapp_subscribers"), /permission denied/);
    await assert.rejects(interest(soon), /permission denied/);
    await assert.rejects(db.query("select subscribe_whatsapp_updates('01711111111','v1')"), /permission denied/);
  });
  await db.query("select set_config('request.jwt.claim.sub','',false)");
  await asRole("authenticated", async () => {
    assert.equal((await db.query("select * from interest_requests")).rows.length, 0);
    assert.equal((await db.query("select * from whatsapp_subscribers")).rows.length, 0);
    await assert.rejects(db.query("insert into interest_requests(product_id,phone) values($1,'01711111112')", [soon]), /permission denied/);
  });
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [adminId]);
  await asRole("authenticated", async () => {
    assert.equal((await db.query("select * from interest_requests")).rows.length, 1);
    await db.query("update interest_requests set status='contacted', contacted_at=now()");
  });
});

// --- R1.6 WhatsApp ------------------------------------------------------------------

const wa = () => db.query("select * from whatsapp_subscribers").then((r) => r.rows);

test("WhatsApp: a repeat submit for an active number keeps the original consent", async () => {
  await db.query("select subscribe_whatsapp_updates('+8801711111111','form-v1')");
  const [first] = await wa();
  await db.query("select subscribe_whatsapp_updates('01711111111','form-v2')");
  const rows = await wa();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].consent_version, "form-v1");
  assert.equal(rows[0].consent_at.getTime(), first.consent_at.getTime());
  await assert.rejects(db.query("select subscribe_whatsapp_updates('01711111111','bad version!')"), /Invalid consent version/);
});

test("WhatsApp: the web form never reactivates an opted-out number, it only marks pending re-consent", async () => {
  // Bug in e5bb0d1: a replay or anyone knowing the number cleared opted_out_at.
  await db.query("select subscribe_whatsapp_updates('01711111111','form-v1')");
  await db.query("update whatsapp_subscribers set opted_out_at=now()");
  await db.query("select subscribe_whatsapp_updates('01711111111','form-v2')");
  const [row] = await wa();
  assert.ok(row.opted_out_at, "still opted out");
  assert.equal(row.consent_version, "form-v1");
  assert.ok(row.reconsent_requested_at, "pending re-consent recorded");
});

test("WhatsApp: only an admin, with new consent, can reactivate; reactivation clears the pending flag", async () => {
  await db.query("select subscribe_whatsapp_updates('01711111111','form-v1')");
  await db.query("update whatsapp_subscribers set opted_out_at=now()");
  await db.query("select subscribe_whatsapp_updates('01711111111','form-v1')");
  await assert.rejects(db.query("update whatsapp_subscribers set opted_out_at=null"), /new explicit consent/);
  await db.query("select set_config('request.jwt.claim.sub','',false)");
  await assert.rejects(
    db.query("update whatsapp_subscribers set opted_out_at=null, consent_at=clock_timestamp(), consent_version='whatsapp-msg-1'"),
    /Only an admin/,
  );
  // The real path: the admin panel updates as the authenticated role with an admin JWT.
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [adminId]);
  await asRole("authenticated", () =>
    db.query("update whatsapp_subscribers set opted_out_at=null, consent_at=clock_timestamp(), consent_version='whatsapp-msg-1'"));
  const [row] = await wa();
  assert.equal(row.opted_out_at, null);
  assert.equal(row.reconsent_requested_at, null);
  assert.equal(row.consent_version, "whatsapp-msg-1");
});

test("WhatsApp: an admin re-consent with the same consent text version succeeds", async () => {
  await db.query("select subscribe_whatsapp_updates('01711111111','form-v1')");
  await db.query("update whatsapp_subscribers set opted_out_at=now()");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [adminId]);
  await asRole("authenticated", async () => {
    await assert.rejects(db.query("update whatsapp_subscribers set opted_out_at=null"), /new explicit consent/);
    await db.query("update whatsapp_subscribers set opted_out_at=null, consent_at=clock_timestamp()");
  });
  const [row] = await wa();
  assert.equal(row.opted_out_at, null);
  assert.equal(row.consent_version, "form-v1");
});

test("category hierarchy checks use an advisory lock, not a table lock upgrade", async () => {
  const fn = (await db.query("select prosrc from pg_proc where proname='enforce_category_hierarchy'")).rows[0].prosrc;
  assert.match(fn, /pg_advisory_xact_lock\(hashtext\('kena_sathi\.categories\.hierarchy'\)\)/);
  assert.doesNotMatch(fn, /lock table categories in/i);
  const root = (await db.query("select id from categories where slug='home-solutions'")).rows[0].id;
  await db.query("insert into categories(name,slug,section,parent_id,is_active) values('Laundry','home-laundry','home',$1,false)", [root]);
  await db.query("delete from categories where slug='home-laundry'");
});

// --- Codex review fixes: caller-supplied first_stocked_at, explicit coming_soon ------

test("a caller-supplied first_stocked_at is ignored on insert and update", async () => {
  // Bug in e5bb0d1: a never-stocked product could be given a date and show "স্টক শেষ".
  const id = randomUUID();
  await db.query("insert into products(id,name,slug,price,stock_quantity,first_stocked_at) values($1::uuid,'Fake',$2,100,0,'2025-01-01')", [id, id]);
  assert.equal((await row(id)).first_stocked_at, null);
  await db.query("update products set first_stocked_at='2025-01-01' where id=$1", [id]);
  assert.equal((await row(id)).first_stocked_at, null);
  const state = (await db.query("select storefront_state(is_active,availability,stock_quantity,first_stocked_at) as s from products where id=$1", [id])).rows[0].s;
  assert.equal(state, "hidden");
  const withStock = randomUUID();
  await db.query("insert into products(id,name,slug,price,stock_quantity,first_stocked_at) values($1::uuid,'Real',$2,100,3,'2020-01-01')", [withStock, withStock]);
  assert.ok((await row(withStock)).first_stocked_at.getFullYear() >= 2026, "trigger time, not caller value");
});

test("an explicit coming_soon save with stock is rejected, not silently flipped", async () => {
  // Bug in e5bb0d1: availability='coming_soon' with stock > 0 became 'available'.
  const id = await product({ stock: 0, availability: "coming_soon" });
  await assert.rejects(db.query("update products set availability='coming_soon', stock_quantity=5 where id=$1", [id]), /cannot have stock/);
  const p = await row(id);
  assert.equal(p.availability, "coming_soon");
  assert.equal(p.stock_quantity, 0);
  // A stock-only update (the V9 cancellation restock path) still turns it available.
  await db.query("update products set stock_quantity=4 where id=$1", [id]);
  assert.equal((await row(id)).availability, "available");
});

// --- Grants: non-admin and EXECUTE matrix -------------------------------------------

test("a non-admin authenticated user cannot read, change or delete interest or WhatsApp rows", async () => {
  const soon = await product({ stock: 0, availability: "coming_soon" });
  await interest(soon);
  await db.query("select subscribe_whatsapp_updates('01711111111','v1')");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [randomUUID()]);
  await asRole("authenticated", async () => {
    for (const table of ["interest_requests", "whatsapp_subscribers"]) {
      assert.equal((await db.query(`select * from ${table}`)).rows.length, 0);
      assert.equal((await db.query(`update ${table} set updated_at=now()`)).affectedRows ?? 0, 0);
      assert.equal((await db.query(`delete from ${table}`)).affectedRows ?? 0, 0);
    }
  });
  await db.exec("reset role");
  assert.equal((await db.query("select count(*)::int as n from interest_requests")).rows[0].n, 1);
  assert.equal((await db.query("select count(*)::int as n from whatsapp_subscribers")).rows[0].n, 1);
});

test("EXECUTE matrix: service-only RPCs are closed to anon and authenticated", async () => {
  const soon = await product({ stock: 0, availability: "coming_soon" });
  const serviceOnly = [
    ["select submit_product_interest($1::uuid,'01711111111')", [soon]],
    ["select subscribe_whatsapp_updates('01711111111','v1')", []],
    ["select normalize_bd_mobile('01711111111')", []],
  ];
  const open = [
    ["select storefront_state(true,'available',1,null)", []],
    ["select * from get_unavailable_product('x')", []],
    ["select is_valid_tag_list('{a}')", []],
  ];
  for (const role of ["anon", "authenticated"]) {
    await asRole(role, async () => {
      for (const [sql, args] of serviceOnly) await assert.rejects(db.query(sql, args), /permission denied/, `${role}: ${sql}`);
      for (const [sql, args] of open) await db.query(sql, args);
    });
  }
  await asRole("service_role", async () => {
    for (const [sql, args] of serviceOnly) await db.query(sql, args);
  });
});

// --- R1.9 unavailable-product lookup ------------------------------------------------

test("lookup returns only inactive real products, by exact slug, with name/slug/state only", async () => {
  const dummySlug = "dummy-" + randomUUID();
  // Never stocked and inactive, like the nine legacy dummy rows.
  await product({ stock: 0, active: false, slug: dummySlug });
  const realSlug = "real-" + randomUUID();
  const realId = await product({ stock: 3, slug: realSlug });
  await db.query("update products set is_active=false, stock_quantity=0 where id=$1", [realId]);
  const activeSlug = "active-" + randomUUID();
  await product({ stock: 3, slug: activeSlug });

  const lookup = (slug) => asRole("anon", () => db.query("select * from get_unavailable_product($1)", [slug])).then((r) => r.rows);
  assert.deepEqual(await lookup(dummySlug), []);
  assert.deepEqual(await lookup(activeSlug), []);
  assert.deepEqual(await lookup("real-%"), []);
  const found = await lookup(realSlug);
  assert.deepEqual(Object.keys(found[0]).sort(), ["name", "slug", "state"]);
  assert.equal(found[0].state, "hidden");
});
