import { test } from "node:test";
import assert from "node:assert/strict";
import { checkoutAttempt, checkoutFingerprint } from "../../src/lib/checkout-attempt";
import { jsonLd, productStructuredData } from "../../src/lib/seo";
import type { Product } from "../../src/lib/data";
import { publicAnalyticsUrl } from "../../src/lib/analytics-privacy";

test('checkout key survives retries and changes when customer/cart details change',async()=>{
  const form=new FormData();form.set('customer_phone','01711111111');form.set('cart_items','[]');
  const fingerprint=await checkoutFingerprint(form);const first=checkoutAttempt(fingerprint,null);
  assert.equal(checkoutAttempt(fingerprint,JSON.stringify(first)).key,first.key);
  form.set('customer_phone','01722222222');
  assert.notEqual(checkoutAttempt(await checkoutFingerprint(form),JSON.stringify(first)).key,first.key);
  assert.ok(checkoutAttempt(fingerprint,'broken').key);
  assert.ok(!JSON.stringify(first).includes('01711111111'));
});
test('structured data cannot terminate a script and does not invent ratings',()=>{
  const product={id:'id',slug:'test',name:'</script><script>alert(1)</script>',description:'Test',price:100,stock:0} as Product;
  const data=productStructuredData(product,'https://kenasathi.com',{reviewCount:0,averageRating:null});
  assert.ok(!jsonLd(data).includes('</script>'));assert.equal(data.offers.priceCurrency,'BDT');
  assert.equal(data.offers.availability,'https://schema.org/OutOfStock');assert.ok(!('aggregateRating' in data));
  assert.equal(productStructuredData(product,'https://kenasathi.com',{reviewCount:2,averageRating:4.5}).aggregateRating?.reviewCount,2);
});

test('analytics excludes customer/order pages and removes search data',()=>{
  assert.equal(publicAnalyticsUrl('https://kenasathi.com/track-order?t=secret'),null);
  assert.equal(publicAnalyticsUrl('https://kenasathi.com/payment/success?t=secret'),null);
  assert.equal(publicAnalyticsUrl('https://kenasathi.com/admin/orders/secret'),null);
  assert.equal(publicAnalyticsUrl('https://kenasathi.com/products?q=01711111111#private'),'https://kenasathi.com/products');
  assert.equal(publicAnalyticsUrl('invalid'),null);
});
