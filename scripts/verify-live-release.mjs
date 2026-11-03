import assert from 'node:assert/strict';

// Usage: node scripts/verify-live-release.mjs [base-url] [--require-catalog]
// Without --require-catalog an empty store (no product or category URLs in the
// sitemap) passes, and the catalog checks are reported as skipped. Every URL the
// sitemap does list is still checked, so a stale sitemap pointing at removed
// products fails instead of being hidden. Use --require-catalog once real
// products are live (R11.3).
const args=process.argv.slice(2);
const requireCatalog=args.includes('--require-catalog');
const base=new URL(args.find(arg=>!arg.startsWith('--'))??'https://kenasathi.com');
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
const products=urls.filter(x=>x.pathname.startsWith('/products/'));
const categories=urls.filter(x=>x.pathname.startsWith('/categories/'));
if(requireCatalog) assert.ok(products.length&&categories.length,'Product/category sitemap URLs (--require-catalog)');

// Every listed product must exist and carry Product JSON-LD; a 404 here means the
// sitemap still lists a removed or hidden product.
for(const product of products){
  const response=await fetch(new URL(product.pathname,base),{signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200,`${product.pathname} is listed in sitemap.xml but returns ${response.status} (stale sitemap or hidden product)`);
  const body=await response.text();
  results.push({path:product.pathname,status:response.status});
  assert.ok(body.includes('application/ld+json')&&body.includes('"@type":"Product"'),`${product.pathname} Product JSON-LD`);
  assert.ok(body.includes('"priceCurrency":"BDT"'),`${product.pathname} BDT price`);
  assert.ok(body.includes(`href="https://kenasathi.com${product.pathname}"`),`${product.pathname} canonical`);
}
for(const category of categories) await check(category.pathname);

const catalog={mode:products.length?'products':'empty',products:products.length,categories:categories.length,
  ...(products.length?{}:{skipped:'product detail, JSON-LD and canonical checks (no product URLs in sitemap)'})};
console.log(JSON.stringify({base:base.origin,passed:results.length,catalog,checks:results},null,2));
