// Loopback-only, disposable PostgREST boundary for browser tests. Never deployed.
import { createServer } from "node:http";
import { applyMigrationFile, applyRollbackFile, createTestDatabase } from "./database.mjs";
import { randomUUID } from "node:crypto";

export async function startDatabaseFixture(port=54329) {
  const db=await createTestDatabase();
  // Production after V12 has no demo catalog. The browser suite needs one, so the fixture
  // undoes V12 with its own rollback (which also exercises the rollback on every run);
  // /test/catalog-cutover re-applies V12 to test the storefront after the cutover.
  await applyRollbackFile(db,'V12-rollback.sql');
  const adminId=randomUUID();
  const user={id:adminId,aud:'authenticated',role:'authenticated',email:'admin@example.invalid',
    app_metadata:{provider:'email',providers:['email']},user_metadata:{},created_at:new Date().toISOString()};
  await db.query("insert into admin_users(user_id,email,role) values($1,$2,'owner')",[adminId,user.email]);
  const accessToken=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),
    Buffer.from(JSON.stringify({sub:adminId,exp:Math.floor(Date.now()/1000)+3600,aud:'authenticated',role:'authenticated'})).toString('base64url'),
    Buffer.from('test-only-signature').toString('base64url')].join('.');
  const server=createServer(async(req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1');
    const numericFields=new Set(['price','discount_price','subtotal','delivery_charge','discount_amount','total_amount','unit_price','total_price','average_rating','review_count']);
    const send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data,(key,value)=>numericFields.has(key)&&value!==null?Number(value):value));};
    try {
      if(url.pathname==='/test/orders') return send((await db.query('select id,order_number,tracking_token,payment_status,customer_note,subtotal::text,delivery_charge::text,total_amount::text from orders')).rows);
      if(url.pathname==='/test/ready') return send({ready:true});
      // Simulates a catalog change made outside the admin panel (direct DB update).
      if(url.pathname==='/test/product-active'&&req.method==='POST') {
        const slug=url.searchParams.get('slug');const active=url.searchParams.get('active')==='true';
        const {rows}=await db.query('update products set is_active=$2 where slug=$1 returning slug,is_active',[slug,active]);
        return send(rows[0]??{message:'No such product'},rows.length?200:404);
      }
      // R2.3: move a product through the storefront states. Fields are applied one
      // update at a time, in the order given, so the first_stocked_at trigger sees each step.
      if(url.pathname==='/test/product-update'&&req.method==='POST') {
        const slug=url.searchParams.get('slug');
        const allowed={stock:'stock_quantity',availability:'availability',active:'is_active',estimated:'estimated_price',age_min:'age_min_months',age_max:'age_max_months',video:'video_url',featured:'is_featured',description:'description',name:'name'};
        for(const [key,value] of url.searchParams) {
          if(key==='slug') continue;
          if(key==='goals') {await db.query('update products set learning_goals=$2::text[] where slug=$1',[slug,value?value.split(','):[]]);continue;}
          if(key==='tags') {await db.query('update products set problem_tags=$2::text[] where slug=$1',[slug,value?value.split(','):[]]);continue;}
          if(key==='category') {await db.query('update products set category_id=(select id from categories where slug=$2) where slug=$1',[slug,value]);continue;}
          const column=allowed[key];
          if(!column) return send({message:'Unsupported field'},400);
          await db.query(`update products set ${column}=$2 where slug=$1`,[slug,value===''?null:value]);
        }
        const {rows}=await db.query('select slug,stock_quantity,availability,is_active,first_stocked_at from products where slug=$1',[slug]);
        return send(rows[0]??{message:'No such product'},rows.length?200:404);
      }
      // Test-only: mark an order delivered, so a verified review can be submitted.
      if(url.pathname==='/test/order-delivered'&&req.method==='POST') {
        const {rows}=await db.query("update orders set order_status='delivered' where tracking_token=$1 returning order_number",[url.searchParams.get('token')]);
        return send(rows[0]??{message:'No such order'},rows.length?200:404);
      }
      // Test-only: apply V12 (the real migration file) or its rollback, to test the cutover.
      if(url.pathname==='/test/catalog-cutover'&&req.method==='POST') {
        const action=url.searchParams.get('action');
        if(action==='apply') await applyMigrationFile(db,'V12__hide_legacy_demo_catalog.sql');
        else if(action==='rollback') await applyRollbackFile(db,'V12-rollback.sql');
        else return send({message:'Unknown action'},400);
        const {rows}=await db.query("select count(*) filter (where is_active)::int as active_categories from categories where section is null");
        return send({action,...rows[0]});
      }
      // Test-only: switch a category on or off (the redesign categories are seeded inactive).
      if(url.pathname==='/test/category-active'&&req.method==='POST') {
        const {rows}=await db.query('update categories set is_active=$2 where slug=$1 returning slug,is_active',[url.searchParams.get('slug'),url.searchParams.get('active')==='true']);
        return send(rows[0]??{message:'No such category'},rows.length?200:404);
      }
      if(url.pathname==='/auth/v1/token') {
        let body='';for await(const chunk of req) body+=chunk;
        const credentials=JSON.parse(body||'{}');
        if(credentials.email!==user.email||credentials.password!=='isolated-test-password') return send({message:'Invalid test login'},400);
        return send({access_token:accessToken,refresh_token:'test-refresh-token',token_type:'bearer',expires_in:3600,user});
      }
      if(url.pathname==='/auth/v1/user'&&req.headers.authorization===`Bearer ${accessToken}`) return send(user);
      if(url.pathname==='/auth/v1/logout') return send({});
      if(url.pathname.startsWith('/auth/')) return send({message:'No test session'},401);
      const rpc=url.pathname.split('/rpc/')[1];
      if(rpc) {
        let body='';for await(const chunk of req) body+=chunk;
        const args=JSON.parse(body||'{}');
        const allowed=['create_checkout_order','get_product_review_summary','get_public_product_reviews','is_within_public_rate_limit','record_public_rate_limit_hit','is_admin','update_admin_order','reconcile_cancelled_stock','get_unavailable_product','submit_verified_product_review'];
        if(!allowed.includes(rpc)) return send({message:'Unsupported test RPC'},400);
        const names=Object.keys(args);
        if(names.some(x=>!/^p_[a-z_]+$/.test(x))) return send({message:'Invalid argument'},400);
        const {rows}=await db.transaction(async(tx)=>{
          await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[req.headers.authorization===`Bearer ${accessToken}`?adminId:'']);
          return tx.query(`select * from ${rpc}(${names.map((name,i)=>`${name} => $${i+1}`).join(',')})`,Object.values(args).map(x=>x!==null&&typeof x==='object'?JSON.stringify(x):x));
        });
        return send(['is_within_public_rate_limit','record_public_rate_limit_hit','is_admin','update_admin_order','reconcile_cancelled_stock'].includes(rpc)?Object.values(rows[0])[0]:rows);
      }
      const table=url.pathname.split('/rest/v1/')[1];
      if(!['products','categories','orders','order_items','payments','product_reviews','admin_users'].includes(table)) return send({message:'Unsupported test table'},404);
      let rows=(await db.query(`select * from ${table}`)).rows;
      for(const [key,value] of url.searchParams) {
        if(value.startsWith('eq.')) rows=rows.filter(row=>String(row[key])===value.slice(3));
      }
      if(table==='products') {
        const categories=(await db.query('select * from categories')).rows;
        const images=(await db.query('select * from product_images')).rows;
        rows=rows.map(row=>({...row,categories:categories.find(c=>c.id===row.category_id)??null,product_images:images.filter(image=>image.product_id===row.id)}));
      }
      if(req.headers.accept?.includes('application/vnd.pgrst.object+json')) return send(rows[0]??null);
      if(req.method==='HEAD') {res.writeHead(200,{'Content-Range':`0-0/${rows.length}`});return res.end();}
      return send(rows);
    } catch(error) {return send({message:error.message,code:error.code??'TEST'},400);}
  });
  // A busy port must fail the run loudly (EADDRINUSE), never leave a half-started fixture.
  // Port 0 asks the OS for a free port; the real port is returned to the caller.
  try {
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{server.off('error',reject);resolve();});});
  } catch(error) {
    await db.close();
    throw new Error(`Test database fixture could not listen on 127.0.0.1:${port}: ${error.code??error.message}`);
  }
  return {port:server.address().port,close:async()=>{await new Promise(resolve=>server.close(resolve));await db.close();}};
}
