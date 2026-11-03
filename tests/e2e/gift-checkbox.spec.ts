import { expect, test, type Page } from "@playwright/test";

// R8.1: free "send as gift" checkbox writes a fixed note line; money stays the same.
const GIFT_LINE = "[উপহার] প্যাকেটে দামের কাগজ বা রসিদ দেবেন না";
const fixture = () => `http://127.0.0.1:${process.env.E2E_FIXTURE_PORT}`;

async function placeOrder(page: Page, gift: boolean) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.goto("/products");
  await page.locator('[data-testid="add-to-cart-button"]:enabled').first().click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
  await page.goto("/checkout");
  await page.locator('[name="customer_name"]').fill("Browser Test");
  await page.locator('[name="customer_phone"]').fill("01712345678");
  await page.locator('[name="customer_district"]').selectOption("Dhaka");
  await page.locator('[name="customer_address"]').fill("Disposable test address Dhaka");
  await page.locator('[name="customer_note"]').fill("বিকেলে ফোন করবেন");
  const box = page.getByRole("checkbox", { name: /উপহার হিসেবে পাঠান/ });
  await expect(box).not.toBeChecked();
  if (gift) await box.check();
  // The total shown before submitting, after the gift choice, is what must be stored.
  const shownTotal = Number((await page.getByTestId("order-total").innerText()).replace(/[^0-9]/g, ""));
  await page.getByRole("button", { name: "অর্ডার নিশ্চিত করুন" }).click();
  await expect(page).toHaveURL(/\/payment\/success\?t=[0-9a-f]{32}/, { timeout: 30000 });
  return { token: new URL(page.url()).searchParams.get("t"), shownTotal };
}

test("gift checkbox is visible and free on a 390px phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/products");
  await page.locator('[data-testid="add-to-cart-button"]:enabled').first().click();
  await page.goto("/checkout");
  await expect(page.getByRole("checkbox", { name: "উপহার হিসেবে পাঠান (প্যাকেটে দামের কাগজ থাকবে না)" })).toBeVisible();
  await expect(page.getByText("বিনা খরচে। দাম আর মোট টাকা একই থাকবে।")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("a gift order stores the fixed line, keeps the total and shows the flag in admin", async ({ page, request }) => {
  test.skip(process.env.E2E_ISOLATED !== "1", "Order creation runs only against the disposable local database.");
  const plainOrder = await placeOrder(page, false);
  const giftOrder = await placeOrder(page, true);
  const orders = await (await request.get(`${fixture()}/test/orders`)).json();
  const plain = orders.find((o: { tracking_token: string }) => o.tracking_token === plainOrder.token);
  const gift = orders.find((o: { tracking_token: string }) => o.tracking_token === giftOrder.token);
  expect(plain.customer_note).toBe("বিকেলে ফোন করবেন");
  expect(gift.customer_note).toBe(`${GIFT_LINE}\nবিকেলে ফোন করবেন`);
  // The gift choice adds no charge: stored totals match what checkout showed, Dhaka ৳60.
  for (const [order, shown] of [[plain, plainOrder.shownTotal], [gift, giftOrder.shownTotal]] as const) {
    expect(Number(order.delivery_charge)).toBe(60);
    expect(Number(order.total_amount)).toBe(Number(order.subtotal) + 60);
    expect(Number(order.total_amount)).toBe(shown);
  }

  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto(`/admin/orders/${gift.order_number}`);
  await expect(page.getByTestId("admin-gift-flag")).toBeVisible();
  await expect(page.getByText("Note: বিকেলে ফোন করবেন")).toBeVisible();
  await page.goto(`/admin/orders/${plain.order_number}`);
  await expect(page.getByTestId("admin-gift-flag")).toHaveCount(0);
});
