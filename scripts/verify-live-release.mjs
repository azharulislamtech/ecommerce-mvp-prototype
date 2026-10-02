import assert from 'node:assert/strict';

const base=new URL(process.argv[2]??'https://kenasathi.com');
const results=[];
async function check(path,status=200,{privatePage=false,redirect=false}={}) {
  const response=await fetch(new URL(path,base),{redirect:redirect?'manual':'follow',signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,status,`${path} HTTP status`);
  if(privatePage) assert.match(response.headers.get('x-robots-tag')??'',/noindex/);
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  const body=await response.text();
  results.push({path,status:response.status});
  return {response,body};
}
await check('/');await check('/products');
const health=await check('/api/health');assert.deepEqual(JSON.parse(health.body),{status:'ok'});
assert.match(health.response.headers.get('cache-control')??'',/no-store/);
for(const path of ['/cart','/checkout','/track-order','/admin/login','/payment/success']) await check(path,200,{privatePage:true});
const guard=await check('/admin',307,{redirect:true});assert.match(guard.response.headers.get('location')??'',/\/admin\/login/);
await check('/products/missing-regression-test-product',404);
const sitemap=await check('/sitemap.xml');
assert.ok(!sitemap.body.includes('/track-order'));
const urls=[...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>new URL(x[1]));
assert.ok(urls.every(x=>x.origin==='https://kenasathi.com'));
const product=urls.find(x=>x.pathname.startsWith('/products/'));
const category=urls.find(x=>x.pathname.startsWith('/categories/'));
assert.ok(product&&category,'Product/category sitemap URLs');
const detail=await check(product.pathname);await check(category.pathname);
assert.ok(detail.body.includes('application/ld+json')&&detail.body.includes('"@type":"Product"'));
assert.ok(detail.body.includes('"priceCurrency":"BDT"'));
assert.ok(detail.body.includes(`href="https://kenasathi.com${product.pathname}"`));
console.log(JSON.stringify({base:base.origin,passed:results.length,checks:results},null,2));
