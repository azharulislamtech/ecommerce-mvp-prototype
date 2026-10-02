import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createTestDatabase } from "../support/database.mjs";

let db;
const adminId = randomUUID();
let productId;
before(async () => {
  db = await createTestDatabase();
  await db.query(`insert into admin_users(user_id,email,role) values($1,'test@example.invalid','owner')`,[adminId]);
  await db.query(`select set_config('request.jwt.claim.sub',$1,false)`,[adminId]);
});
beforeEach(async () => {
  await db.exec('reset role; truncate orders cascade; truncate public_rate_limits;');
  productId = randomUUID();
  await db.query(`insert into products(id,name,slug,price,stock_quantity,is_active) values($1::uuid,'Test product',$2,100,10,true)`,[productId,productId]);
  await db.query(`select set_config('request.jwt.claim.sub',$1,false)`,[adminId]);
});
after(() => db.close());

async function checkout({ key=randomUUID(), phone='01711111111', quantity=2, items, method='cash-on-delivery', ip='a'.repeat(64), district='Dhaka' }={}) {
  const result=await db.query(`select * from create_checkout_order($1,$2,$3,$4,$5,$6,$7::jsonb,$8::uuid,$9)`,
    ['Test customer',phone,district,'Test address Dhaka','',method,JSON.stringify(items??[{product_id:productId,quantity}]),key,ip]);
  return result.rows[0];
}
async function stock() {return (await db.query('select stock_quantity from products where id=$1',[productId])).rows[0].stock_quantity;}
async function update(order, status, payment='pending') {
  return db.query('select update_admin_order($1,$2,$3)',[order.order_number,status,payment]);
}

test('legacy COD reconciliation preserves settlement facts and excludes gateway records',async()=>{
  const cod=await checkout();
  const gateway=await checkout({method:'sslcommerz'});
  await db.query("update orders set payment_status='paid' where id in ($1::uuid,$2::uuid)",[cod.order_id,gateway.order_id]);
  const migration=await readFile('db/migration/V10__reconcile_legacy_cod_payment_status.sql','utf8');
  await db.exec(migration);await db.exec(migration);
  const rows=(await db.query('select p.order_id,p.payment_status,p.paid_at from payments p where p.order_id in ($1::uuid,$2::uuid)',[cod.order_id,gateway.order_id])).rows;
  assert.equal(rows.find(x=>x.order_id===cod.order_id).payment_status,'paid');
  assert.equal(rows.find(x=>x.order_id===cod.order_id).paid_at,null);
  assert.equal(rows.find(x=>x.order_id===gateway.order_id).payment_status,'pending');
  assert.equal((await db.query("select count(*)::int as n from payment_events where event_type='migration.cod_status_reconciled'")).rows[0].n,1);
  assert.equal(await stock(),6);
});

test('checkout charges database price/district delivery and writes one payment',async()=>{
  const order=await checkout();
  assert.equal(Number(order.total_amount),260); assert.equal(await stock(),8);
  assert.match(order.tracking_token,/^[0-9a-f]{32}$/);
  assert.equal((await db.query('select count(*)::int as n from payments')).rows[0].n,1);
  assert.equal(Number((await checkout({district:'Chattogram'})).delivery_charge),120);
});
test('same request replay returns the same order without decrement or duplicate rows',async()=>{
  const key=randomUUID(); const first=await checkout({key}); const second=await checkout({key});
  assert.equal(first.order_id,second.order_id); assert.equal(second.replayed,true); assert.equal(await stock(),8);
  assert.equal((await db.query('select count(*)::int as n from orders')).rows[0].n,1);
  await assert.rejects(checkout({key,quantity:3}),/details changed/);
});
test('simultaneously submitted identical requests yield one order',async()=>{
  const key=randomUUID(); const results=await Promise.all([checkout({key}),checkout({key}),checkout({key})]);
  assert.equal(new Set(results.map(x=>x.order_id)).size,1); assert.equal(await stock(),8);
});
test('duplicate product lines are combined; aggregate overstock rolls back everything',async()=>{
  await assert.rejects(checkout({items:[{product_id:productId,quantity:6},{product_id:productId,quantity:6}]}),/Insufficient stock/);
  assert.equal(await stock(),10);
  assert.equal((await db.query('select count(*)::int as n from orders')).rows[0].n,0);
  await checkout({items:[{product_id:productId,quantity:2},{product_id:productId,quantity:3}]});
  assert.equal(await stock(),5);
  assert.equal((await db.query('select count(*)::int as n from order_items')).rows[0].n,1);
});
test('fractional and invalid quantities do not create orders',async()=>{
  for(const quantity of [0,-1,1.5,100]) await assert.rejects(checkout({quantity}));
  assert.equal(await stock(),10);
});
test('cancellation restores stock once; reopening reserves it once',async()=>{
  const order=await checkout(); await update(order,'cancelled'); assert.equal(await stock(),10);
  await update(order,'cancelled'); assert.equal(await stock(),10);
  await update(order,'confirmed'); assert.equal(await stock(),8);
  await update(order,'confirmed'); assert.equal(await stock(),8);
});
test('insufficient stock on reopening rolls back order and payment changes',async()=>{
  const order=await checkout(); await update(order,'cancelled');
  await db.query('update products set stock_quantity=0 where id=$1',[productId]);
  await assert.rejects(update(order,'confirmed','paid'),/insufficient stock/);
  const row=(await db.query('select order_status,payment_status from orders where id=$1',[order.order_id])).rows[0];
  assert.deepEqual(row,{order_status:'cancelled',payment_status:'pending'});
});
test('cancelling dispatched goods does not put unreturned goods back into sellable stock',async()=>{
  const order=await checkout();await update(order,'shipped');await update(order,'cancelled');
  assert.equal(await stock(),8);await update(order,'cancelled');assert.equal(await stock(),8);
  assert.equal((await db.query('select stock_released from orders where id=$1',[order.order_id])).rows[0].stock_released,null);
  await assert.rejects(update(order,'confirmed'),/physical-stock reconciliation/);
});
test('receipt confirmation restocks returned goods once and permits reopening',async()=>{
  const order=await checkout();await update(order,'shipped');await update(order,'cancelled');
  const reconcile=()=>db.query('select reconcile_cancelled_stock($1,false)',[order.order_number]);
  await reconcile();await reconcile();assert.equal(await stock(),10);
  await update(order,'confirmed');assert.equal(await stock(),8);
  assert.equal((await db.query("select count(*)::int as n from payment_events where event_type='admin.stock_reconciled'")).rows[0].n,1);
});
test('historically/manual-restocked goods can be confirmed without adding stock twice',async()=>{
  const order=await checkout();await update(order,'shipped');await update(order,'cancelled');
  await db.query('update products set stock_quantity=10 where id=$1',[productId]);
  await db.query('select reconcile_cancelled_stock($1,true)',[order.order_number]);assert.equal(await stock(),10);
  await assert.rejects(db.query('select reconcile_cancelled_stock($1,false)',[(await checkout({quantity:1})).order_number]),/Only cancelled orders/);
});
test('admin COD settlement synchronizes payment, order and audit event',async()=>{
  const order=await checkout(); await update(order,'delivered','paid');
  const row=(await db.query('select o.payment_status as order_status,p.payment_status,p.paid_at from orders o join payments p on p.order_id=o.id where o.id=$1',[order.order_id])).rows[0];
  assert.equal(row.order_status,'paid');assert.equal(row.payment_status,'paid');assert.ok(row.paid_at);
  assert.equal((await db.query("select count(*)::int as n from payment_events where event_type='admin.order_updated'")).rows[0].n,1);
  await assert.rejects(update(order,'delivered','pending'),/settled payment/);
});
test('rate limit normalizes phone country prefix and replay does not spend budget',async()=>{
  const key=randomUUID(); await checkout({quantity:1,key});
  for(let i=0;i<4;i++) await checkout({quantity:1,phone:'+8801711111111'});
  await assert.rejects(checkout({quantity:1}),/Too many orders/);
  assert.equal((await checkout({key,quantity:1})).replayed,true);assert.equal(await stock(),5);
});
test('IP rate limit is shared across different phones',async()=>{
  await db.query('update products set stock_quantity=100 where id=$1',[productId]);
  for(let i=0;i<30;i++) await checkout({quantity:1,phone:'017'+String(i).padStart(8,'0')});
  await assert.rejects(checkout({quantity:1,phone:'01811111111'}),/Too many orders/);
  assert.equal(await stock(),70);
});
test('unauthorized roles cannot checkout directly, call internal checkout or update admin orders',async()=>{
  const order=await checkout();
  await db.exec('set role anon'); await assert.rejects(checkout(),/permission denied/);
  await assert.rejects(update(order,'cancelled'),/permission denied/); await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub','',false)");
  await assert.rejects(update(order,'cancelled'),/Admin access required/);
  await db.exec('set role service_role');
  await assert.rejects(db.query(`select * from create_checkout_order_internal('Test','01711111111','Dhaka','Test address','','cash-on-delivery','[]')`),/permission denied/);
  await db.exec('reset role');assert.equal(await stock(),8);
});
test('gateway settlement is atomic, duplicate-safe, and does not downgrade paid/refunded orders',async()=>{
  const order=await checkout({method:'sslcommerz'});
  const payment=(await db.query('select id from payments where order_id=$1',[order.order_id])).rows[0];
  const apply=(status)=>db.query(`select apply_verified_payment($1,$2,'test-txn','test-card','{}') as status`,[payment.id,status]);
  await apply('paid');await apply('paid'); assert.equal((await apply('failed')).rows[0].status,'paid');
  assert.equal((await db.query("select count(*)::int as n from payment_events where event_type='sslcommerz.status_updated'")).rows[0].n,1);
  await update(order,'cancelled','refunded'); assert.equal(await stock(),10);
  assert.equal((await apply('paid')).rows[0].status,'refunded');
  assert.equal((await db.query('select payment_status from orders where id=$1',[order.order_id])).rows[0].payment_status,'refunded');
});
test('review purchase verification and public moderation still work',async()=>{
  const order=await checkout();await update(order,'delivered','paid');
  await db.query(`select * from submit_verified_product_review($1,$2,'01711111111',5::smallint,'Good product','This is a useful product and arrived safely.')`,[productId,order.order_number]);
  assert.equal(Number((await db.query('select * from get_product_review_summary($1)',[productId])).rows[0].review_count),0);
  await db.query("update product_reviews set status='approved' where order_id=$1",[order.order_id]);
  assert.equal(Number((await db.query('select * from get_product_review_summary($1)',[productId])).rows[0].review_count),1);
});
