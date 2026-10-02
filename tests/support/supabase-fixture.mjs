// Loopback-only, disposable PostgREST boundary for browser tests. Never deployed.
import { createServer } from "node:http";
import { createTestDatabase } from "./database.mjs";
import { randomUUID } from "node:crypto";

export async function startDatabaseFixture(port=54329) {
  const db=await createTestDatabase();
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
      if(url.pathname==='/test/orders') return send((await db.query('select id,order_number,tracking_token,payment_status from orders')).rows);
      if(url.pathname==='/test/ready') return send({ready:true});
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
        const allowed=['create_checkout_order','get_product_review_summary','get_public_product_reviews','is_within_public_rate_limit','record_public_rate_limit_hit','is_admin','update_admin_order','reconcile_cancelled_stock'];
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
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
  return {close:async()=>{await new Promise(resolve=>server.close(resolve));await db.close();}};
}
