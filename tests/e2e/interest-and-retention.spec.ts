import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// R7.1 / R7.2 / R9.2: the interest form on a coming-soon product, the admin list, deletion on
// request, the retention run, and the scheduled route's secret check.
const fixture = () => `http://127.0.0.1:${process.env.E2E_FIXTURE_PORT}`;

async function update(request: APIRequestContext, slug: string, fields: [string, string][]) {
  const response = await request.post(`${fixture()}/test/product-update?${new URLSearchParams([["slug", slug], ...fields])}`);
  expect(response.status(), await response.text()).toBe(200);
}

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("the scheduled retention route needs the secret and returns only counts", async ({ request }) => {
  expect((await request.get("/api/cron/retention")).status()).toBe(401);
  expect((await request.get("/api/cron/retention", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);
  test.skip(process.env.E2E_ISOLATED !== "1", "The real run needs the disposable local database.");
  const response = await request.get("/api/cron/retention", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.ok).toBe(true);
  expect(body.results.map((row: { rule: string }) => row.rule)).toContain("orders_anonymized");
  expect(JSON.stringify(body)).not.toMatch(/01[3-9]\d{8}/);
});

test("a visitor registers interest; the admin sees, contacts and deletes it", async ({ page, request }) => {
  test.skip(process.env.E2E_ISOLATED !== "1", "Writes run only against the disposable local database.");
  test.setTimeout(300_000);
  const rows: { id: string; slug: string; stock_quantity: number }[] =
    await (await request.get(`${fixture()}/rest/v1/products?is_active=eq.true`)).json();
  const target = rows.filter((row) => row.stock_quantity > 0).sort((a, b) => b.slug.localeCompare(a.slug))[0];
  try {
    await update(request, target.slug, [["stock", "0"], ["availability", "coming_soon"], ["estimated", "750"]]);
    await expect.poll(async () => {
      await page.goto(`/products/${target.slug}`);
      return page.getByTestId("interest-form").count();
    }, { timeout: 150_000, intervals: [3_000] }).toBe(1);

    const form = page.getByTestId("interest-form");
    await expect(page.getByTestId("interest-notice")).toHaveText("এটি অর্ডার নয়। পণ্য এলে আমরা চূড়ান্ত দাম জানিয়ে যোগাযোগ করব। এখন কোনো টাকা দিতে হবে না, কোনো বাধ্যবাধকতা নেই।");
    await expect(form.getByRole("link", { name: "গোপনীয়তা নীতি" })).toHaveAttribute("href", "/privacy-policy");
    await expect(page.getByTestId("sample-image-note")).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/জন আগ্রহী|interested/);
    // The form fits a 390px phone.
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.setViewportSize({ width: 1280, height: 720 });

    // A bad number is refused in Bangla and the name stays.
    await form.getByLabel("নাম (ঐচ্ছিক)").fill("রহিম");
    await form.getByLabel("মোবাইল নম্বর (WhatsApp)").fill("12345");
    await form.getByRole("button", { name: "আগ্রহ জানান" }).click();
    await expect(form.getByText("সঠিক মোবাইল নম্বর লিখুন", { exact: false }).first()).toBeVisible({ timeout: 30_000 });
    await expect(form.getByLabel("নাম (ঐচ্ছিক)")).toHaveValue("রহিম");

    await form.getByLabel("মোবাইল নম্বর (WhatsApp)").fill("01799887766");
    await form.getByLabel("কতটা লাগবে (ঐচ্ছিক)").fill("2");
    await form.getByRole("button", { name: "আগ্রহ জানান" }).click();
    await expect(page.getByTestId("interest-thanks")).toContainText("ধন্যবাদ! পণ্য এলে আমরা আপনাকে জানাব।", { timeout: 30_000 });

    // The same number again gets the same thank-you, and still one row.
    await page.goto(`/products/${target.slug}`);
    await page.getByTestId("interest-form").getByLabel("মোবাইল নম্বর (WhatsApp)").fill("01799887766");
    await page.getByTestId("interest-form").getByRole("button", { name: "আগ্রহ জানান" }).click();
    await expect(page.getByTestId("interest-thanks")).toContainText("ধন্যবাদ!", { timeout: 30_000 });
    const stored: { product_id: string; phone: string; quantity: number | null }[] =
      await (await request.get(`${fixture()}/rest/v1/interest_requests?phone=eq.01799887766`)).json();
    expect(stored).toHaveLength(1);
    expect(stored[0].product_id).toBe(target.id);
    expect(stored[0].quantity).toBe(2);

    // The card links to the form.
    await page.goto("/products");
    await expect(page.locator(`[data-testid="product-card"][data-product-id="${target.id}"]`).getByRole("link", { name: "আগ্রহ জানান" }))
      .toHaveAttribute("href", `/products/${target.slug}#interest`);

    // Admin: list, mark contacted, run retention, delete with the broadcast reminder.
    await signIn(page);
    await page.getByRole("link", { name: "Interest", exact: true }).click();
    const row = page.getByTestId("interest-row").filter({ hasText: "01799887766" });
    await expect(row).toContainText("রহিম");
    await expect(row).toContainText("Contacted —");
    await row.getByLabel("Status").selectOption("contacted");
    await row.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status")).toContainText("Interest request updated.");
    await expect(page.getByTestId("interest-row").filter({ hasText: "01799887766" })).not.toContainText("Contacted —");

    await page.getByRole("button", { name: "Run data retention now" }).click();
    await expect(page.getByRole("status")).toContainText("Retention run finished");
    await expect(page.getByRole("status")).toContainText("broadcast list");
    // Contacted today, so the 30-day rule keeps it for now.
    await expect(page.getByTestId("interest-row").filter({ hasText: "01799887766" })).toBeVisible();

    await page.getByTestId("interest-row").filter({ hasText: "01799887766" }).getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("status")).toContainText("Interest request deleted.");
    await expect(page.getByRole("status")).toContainText("broadcast list");
    await expect(page.getByTestId("interest-row").filter({ hasText: "01799887766" })).toHaveCount(0);
  } finally {
    await update(request, target.slug, [["availability", "available"], ["estimated", ""], ["stock", String(target.stock_quantity)]]);
  }
});
