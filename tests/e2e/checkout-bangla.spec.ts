import { expect, test, type Page } from "@playwright/test";

// R2.9: Bangla checkout copy and error handling.

async function fillCheckout(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.goto("/products");
  const button = page.locator('[data-testid="add-to-cart-button"]:enabled').first();
  const productId = await button.getAttribute("data-product-id");
  await button.click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "অর্ডার সম্পন্ন করুন" })).toBeVisible();
  await page.locator('[name="customer_name"]').fill("Browser Test");
  await page.locator('[name="customer_phone"]').fill("01712345678");
  await page.locator('[name="customer_district"]').selectOption("Dhaka");
  await page.locator('[name="customer_address"]').fill("Disposable test address Dhaka");
  return productId;
}

test("checkout copy is Bangla and fits a 390px phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fillCheckout(page);
  for (const text of ["আপনার তথ্য", "মোবাইল নম্বর", "জেলা", "পুরো ঠিকানা", "অর্ডারের সারাংশ", "ডেলিভারি চার্জ", "মোট"]) {
    await expect(page.getByText(text, { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "অর্ডার নিশ্চিত করুন" })).toBeEnabled();
  await expect(page.locator("body")).not.toContainText("Place Order");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("a dropped connection shows a Bangla retry message and keeps the form", async ({ page }) => {
  await fillCheckout(page);
  // Server actions POST to the page URL; fail that request as if the network dropped.
  await page.route("**/checkout", (route) =>
    route.request().method() === "POST" ? route.abort("internetdisconnected") : route.continue());
  await page.getByRole("button", { name: "অর্ডার নিশ্চিত করুন" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "ইন্টারনেট সংযোগে সমস্যা" })).toBeVisible();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.locator('[name="customer_phone"]')).toHaveValue("01712345678");
});

test("a product that goes unavailable during checkout gets a Bangla stock message", async ({ page, request }) => {
  test.skip(process.env.E2E_ISOLATED !== "1", "Catalog changes run only against the disposable local database.");
  const productId = await fillCheckout(page);
  const fixture = `http://127.0.0.1:${process.env.E2E_FIXTURE_PORT}`;
  const products = await (await request.get(`${fixture}/rest/v1/products`)).json();
  const inCart = products.find((p: { id: string }) => p.id === productId);
  expect(inCart, "product in cart").toBeTruthy();
  expect((await request.post(`${fixture}/test/product-active?slug=${encodeURIComponent(inCart.slug)}&active=false`)).status()).toBe(200);
  try {
    await page.getByRole("button", { name: "অর্ডার নিশ্চিত করুন" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "এখন পাওয়া যাচ্ছে না" }).first()).toBeVisible();
    await expect(page).toHaveURL(/\/checkout$/);
    // A server-side rejection keeps what the customer typed.
    await expect(page.locator('[name="customer_phone"]')).toHaveValue("01712345678");
    await expect(page.locator('[name="customer_address"]')).toHaveValue("Disposable test address Dhaka");
  } finally {
    await request.post(`${fixture}/test/product-active?slug=${encodeURIComponent(inCart.slug)}&active=true`);
  }
});
