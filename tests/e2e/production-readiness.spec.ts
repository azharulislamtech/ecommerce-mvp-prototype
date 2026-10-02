import { expect, test } from "@playwright/test";

async function placeTestOrder(page: import("@playwright/test").Page) {
  await page.goto('/products');await page.getByTestId('add-to-cart-button').first().click();
  await expect(page.getByTestId('cart-count')).toHaveText('1');await page.goto('/checkout');
  await page.locator('[name="customer_name"]').fill('Browser Test');
  await page.locator('[name="customer_phone"]').fill('01712345678');
  await page.locator('[name="customer_district"]').selectOption('Dhaka');
  await page.locator('[name="customer_address"]').fill('Disposable test address Dhaka');
  await page.getByRole('button',{name:'Place Order'}).click();
  await expect(page).toHaveURL(/\/payment\/success\?t=[0-9a-f]{32}/,{timeout:30000});
  return new URL(page.url()).searchParams.get('t');
}

test('product metadata and category links expose crawlable commerce content',async({page,request})=>{
  await page.goto('/products');
  const productLink=page.locator('a[href^="/products/"]').first();
  const href=await productLink.getAttribute('href');expect(href).toBeTruthy();
  const response=await request.get(href!);expect(response.status()).toBe(200);
  const html=await response.text();expect(html).toContain('application/ld+json');expect(html).toContain('"@type":"Product"');
  expect(html).toContain('"priceCurrency":"BDT"');expect(html).toContain('rel="canonical"');
  await page.goto('/');await page.locator('a[href^="/categories/"]').first().click();
  await expect(page.locator('h1')).toBeVisible();await expect(page.locator('a[href^="/products/"]').first()).toBeVisible();
});

test('private utility pages are noindex and absent from sitemap',async({request})=>{
  for(const path of ['/cart','/checkout','/track-order','/admin/login','/payment/success']) {
    const response=await request.get(path);expect(response.status()).toBe(200);
    expect(response.headers()['x-robots-tag']).toContain('noindex');
    expect(response.headers()['referrer-policy']).toBe('no-referrer');
  }
  const sitemap=await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/categories/');expect(sitemap).not.toContain('/track-order');
  expect((await request.get('/products/missing-regression-test-product')).status()).toBe(404);
  if(process.env.E2E_ISOLATED==='1') {
    const health=await request.get('/api/health');expect(health.status()).toBe(200);
    expect(await health.json()).toEqual({status:'ok'});
    expect(health.headers()['cache-control']).toContain('no-store');
  }
});

test('mobile product and cart flows fit the viewport',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/products');
  await page.getByTestId('add-to-cart-button').first().click();
  await expect(page.getByTestId('cart-count')).toHaveText('1');await page.goto('/cart');
  await expect(page.getByTestId('cart-line')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('real server action creates a COD order in the isolated database and tracking finds it',async({page,request})=>{
  test.skip(process.env.E2E_ISOLATED!=='1','Order creation runs only against the disposable local database.');
  const token=await placeTestOrder(page);
  await expect(page.getByTestId('cart-count')).toHaveText('0');
  await page.goto(`/track-order?t=${token}`);await expect(page.getByText('Order Not Found',{exact:true})).toHaveCount(0);
  const orders=await (await request.get(`http://127.0.0.1:${process.env.E2E_FIXTURE_PORT}/test/orders`)).json();
  const matching=orders.filter((order: { tracking_token: string })=>order.tracking_token===token);
  expect(matching).toHaveLength(1);
  await expect(page.getByText(matching[0].order_number,{exact:true}).first()).toBeVisible();
});

test('authenticated admin cancellation updates payments and confirms returned inventory',async({page,request})=>{
  test.skip(process.env.E2E_ISOLATED!=='1','Mutations run only against the disposable local database.');
  const token=await placeTestOrder(page);
  const orders=await (await request.get(`http://127.0.0.1:${process.env.E2E_FIXTURE_PORT}/test/orders`)).json();
  const order=orders.find((item: { tracking_token: string })=>item.tracking_token===token);
  expect(order).toBeTruthy();
  await page.goto('/admin/login');
  await page.getByLabel('Email',{exact:true}).fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel('Password',{exact:true}).fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole('button',{name:'Sign In'}).click();await expect(page).toHaveURL(/\/admin$/);
  await page.goto(`/admin/orders/${order.order_number}`);
  await page.locator('[name="order_status"]').selectOption('shipped');
  await page.getByRole('button',{name:'Save Update'}).click();
  await expect(page.getByText('Order status updated.',{exact:true})).toBeVisible();
  await page.locator('[name="order_status"]').selectOption('cancelled');
  await page.getByRole('button',{name:'Save Update'}).click();
  await expect(page.getByRole('heading',{name:'Confirm returned inventory'})).toBeVisible();
  await page.locator('[name="inventory_state"]').selectOption('returned');
  await page.locator('[name="receipt_confirmed"]').check();
  await page.getByRole('button',{name:'Confirm inventory',exact:true}).click();
  await expect(page.getByText('Physical inventory confirmed. Repeated saves will not add stock again.',{exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Confirm returned inventory'})).toHaveCount(0);
  await page.reload();await expect(page.locator('[name="order_status"]')).toHaveValue('cancelled');
});
