import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// R6.2: template descriptions as sections, Bangla payment and review copy — and the
// existing features around them still work (review submit, JSON-LD in BDT).
const fixture = () => `http://127.0.0.1:${process.env.E2E_FIXTURE_PORT}`;

async function update(request: APIRequestContext, slug: string, fields: [string, string][]) {
  const response = await request.post(`${fixture()}/test/product-update?${new URLSearchParams([["slug", slug], ...fields])}`);
  expect(response.status(), await response.text()).toBe(200);
}

const TEMPLATE = [
  "কোন সমস্যা মেটায়",
  "সবজি কাটতে প্রতিদিন অনেক সময় চলে যায়।",
  "",
  "কীভাবে ব্যবহার করবেন",
  "১. সবজি রাখুন",
  "২. ঢাকনা চাপুন",
  "৩. ধুয়ে রাখুন",
  "",
  "মাপ: ২০ × ১০ সেমি",
  "ওজন: ৪৫০ গ্রাম",
  "",
  "সাধারণ প্রশ্ন",
  "প্রশ্ন: ডিশওয়াশারে দেওয়া যাবে?",
  "উত্তর: না, হাতে ধুয়ে নিন।"
].join("\n");

test("a template description shows as sections, with the return answer and Bangla copy", async ({ page, request }) => {
  test.skip(process.env.E2E_ISOLATED !== "1", "Catalog changes run only against the disposable local database.");
  test.setTimeout(300_000);
  const rows: { slug: string; stock_quantity: number; description: string }[] =
    await (await request.get(`${fixture()}/rest/v1/products?is_active=eq.true`)).json();
  const target = rows.filter((row) => row.stock_quantity > 0).sort((a, b) => a.slug.localeCompare(b.slug))[1];
  try {
    await update(request, target.slug, [["description", TEMPLATE]]);
    await expect.poll(async () => {
      await page.goto(`/products/${target.slug}`);
      return page.getByTestId("product-steps").count();
    }, { timeout: 150_000, intervals: [3_000] }).toBe(1);

    const description = page.getByTestId("product-description");
    await expect(description.getByRole("heading", { name: "কোন সমস্যা মেটায়" })).toBeVisible();
    await expect(page.getByTestId("product-steps").locator("li")).toHaveCount(3);
    await expect(page.getByTestId("product-facts")).toContainText("ওজন");
    await expect(page.getByTestId("product-facts")).toContainText("৪৫০ গ্রাম");
    const faq = page.getByTestId("product-faq");
    await faq.getByText("ডিশওয়াশারে দেওয়া যাবে?").click();
    await expect(faq.getByText("না, হাতে ধুয়ে নিন।")).toBeVisible();
    await page.getByTestId("product-return-faq").locator("summary").click();
    await expect(page.getByTestId("product-return-faq")).toContainText("ভাঙা/ভুল/অসম্পূর্ণ পণ্য? ডেলিভারির ৭২ ঘণ্টার মধ্যে জানান");

    await expect(page.getByTestId("product-payment-info")).toContainText("ক্যাশ অন ডেলিভারি");
    for (const old of ["Customer Reviews", "Payment Info", "Description", "Share your experience", "Submit for review"]) {
      await expect(page.locator("main")).not.toContainText(old, { useInnerText: true });
    }
    // Google data keeps the numeric price in BDT.
    const html = await (await request.get(`/products/${target.slug}`)).text();
    expect(html).toContain('"priceCurrency":"BDT"');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally {
    await update(request, target.slug, [["description", target.description]]);
  }
});

async function placeOrder(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.goto("/products");
  const button = page.locator('[data-testid="add-to-cart-button"]:enabled').first();
  const productId = await button.getAttribute("data-product-id");
  await button.click();
  await page.goto("/checkout");
  await page.locator('[name="customer_name"]').fill("Review Test");
  await page.locator('[name="customer_phone"]').fill("01712345678");
  await page.locator('[name="customer_district"]').selectOption("Dhaka");
  await page.locator('[name="customer_address"]').fill("Disposable test address Dhaka");
  await page.getByRole("button", { name: "অর্ডার নিশ্চিত করুন" }).click();
  await expect(page).toHaveURL(/\/payment\/success\?t=[0-9a-f]{32}/, { timeout: 30_000 });
  return { productId, token: new URL(page.url()).searchParams.get("t")! };
}

test("a verified review still submits, with Bangla messages", async ({ page, request }) => {
  test.skip(process.env.E2E_ISOLATED !== "1", "Order and review creation run only against the disposable local database.");
  const { productId, token } = await placeOrder(page);
  const delivered = await request.post(`${fixture()}/test/order-delivered?token=${token}`);
  expect(delivered.status()).toBe(200);
  const { order_number: orderNumber } = await delivered.json();
  const rows: { id: string; slug: string }[] = await (await request.get(`${fixture()}/rest/v1/products`)).json();
  const slug = rows.find((row) => row.id === productId)!.slug;

  await page.goto(`/products/${slug}`);
  const form = page.locator("#write-review");
  await expect(form.getByRole("heading", { name: "আপনার অভিজ্ঞতা লিখুন" })).toBeVisible();

  // A wrong order number gets the Bangla verification message.
  await form.locator('[name="order_number"]').fill("KS-WRONG-0001");
  await form.locator('[name="customer_phone"]').fill("01712345678");
  await form.locator('[name="rating"]').selectOption("5");
  await form.locator('[name="body"]').fill("খুব কাজের জিনিস, প্রতিদিন ব্যবহার করছি।");
  await form.getByRole("button", { name: "রিভিউ পাঠান" }).click();
  await expect(form).toContainText("এই পণ্যের কোনো ডেলিভারি হওয়া অর্ডার মেলানো যায়নি");

  await form.locator('[name="order_number"]').fill(orderNumber);
  await form.locator('[name="customer_phone"]').fill("01712345678");
  await form.locator('[name="rating"]').selectOption("5");
  await form.locator('[name="body"]').fill("খুব কাজের জিনিস, প্রতিদিন ব্যবহার করছি।");
  await form.getByRole("button", { name: "রিভিউ পাঠান" }).click();
  await expect(form).toContainText("ধন্যবাদ। আপনার রিভিউ পাওয়া গেছে, যাচাইয়ের পরে দেখানো হবে।");
});
