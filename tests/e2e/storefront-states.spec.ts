import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// R2.3 / R2.4: the four storefront states on the list, the product page, the cart and
// in the JSON-LD. Product pages and the list are ISR (revalidate 60), so each check
// polls with reloads until the regenerated page shows the new state.
test.describe.configure({ timeout: 300_000 });

type Row = { id: string; slug: string; name: string; stock_quantity: number; first_stocked_at: string | null };
const fixture = () => `http://127.0.0.1:${process.env.E2E_FIXTURE_PORT}`;

async function update(request: APIRequestContext, slug: string, fields: [string, string][]) {
  const query = new URLSearchParams([["slug", slug], ...fields]);
  const response = await request.post(`${fixture()}/test/product-update?${query}`);
  expect(response.status(), await response.text()).toBe(200);
}

async function pollPage(page: Page, path: string, check: () => Promise<boolean>) {
  await expect.poll(async () => {
    const response = await page.goto(path);
    return response ? check() : false;
  }, { timeout: 150_000, intervals: [3_000] }).toBe(true);
}

const productJsonLd = async (page: Page) => {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.map((text) => JSON.parse(text)).find((data) => data["@type"] === "Product") ?? null;
};

test("coming soon, stock ended, never stocked and hidden products behave as the guideline says", async ({ page, request }) => {
  test.skip(process.env.E2E_ISOLATED !== "1", "Catalog changes run only against the disposable local database.");
  const rows: Row[] = await (await request.get(`${fixture()}/rest/v1/products?is_active=eq.true`)).json();
  const inStock = rows.filter((row) => row.stock_quantity > 0).sort((a, b) => a.slug.localeCompare(b.slug));
  expect(inStock.length).toBeGreaterThanOrEqual(4);
  // "Never stocked" must really have no first_stocked_at; earlier tests may have restocked some rows.
  const never = inStock.find((row) => row.first_stocked_at === null);
  expect(never, "a product that was never stocked under V11").toBeTruthy();
  const [soon, ended] = inStock.filter((row) => row.slug !== never!.slug);

  try {
    await update(request, soon.slug, [["stock", "0"], ["availability", "coming_soon"], ["estimated", "900"], ["age_min", "36"], ["age_max", "72"]]);
    // 0 → 5 sets first_stocked_at (it really was in stock), then back to 0 = stock ended.
    await update(request, ended.slug, [["stock", "0"], ["stock", "5"], ["stock", "0"]]);
    // A legacy row that goes to 0 without ever being stocked under V11 is hidden, never "স্টক শেষ".
    await update(request, never!.slug, [["stock", "0"]]);

    const card = (row: Row) => page.locator(`[data-testid="product-card"][data-product-id="${row.id}"]`);
    await pollPage(page, "/products", async () =>
      (await card(soon).getAttribute("data-product-state")) === "coming_soon" &&
      (await card(ended).getAttribute("data-product-state")) === "stock_ended" &&
      (await card(never!).count()) === 0);

    await expect(card(soon).getByTestId("product-state-badge")).toHaveText("শীঘ্রই আসছে");
    await expect(card(soon).getByTestId("product-age-badge")).toHaveText("বয়স ৩–৬ বছর");
    await expect(card(soon).getByTestId("product-price")).toHaveText(/আনুমানিক দাম\s*৳900/);
    await expect(card(soon).getByRole("button")).toHaveCount(0);
    await expect(card(ended).getByTestId("product-state-badge")).toHaveText("স্টক শেষ");
    await expect(card(ended).getByRole("button")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(/sold out/i);
    // The badges fit a 390px phone.
    await page.setViewportSize({ width: 390, height: 844 });
    await card(soon).scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.setViewportSize({ width: 1280, height: 720 });
    // Coming soon appears after what can be bought.
    const states = await page.locator('[data-testid="product-card"]').evaluateAll((cards) => cards.map((c) => c.getAttribute("data-product-state")));
    expect(states.indexOf("coming_soon")).toBeGreaterThan(states.lastIndexOf("in_stock"));

    // Coming soon page: no buy buttons, no offer and no price for Google.
    await pollPage(page, `/products/${soon.slug}`, async () =>
      (await page.getByTestId("product-purchase-panel").getByTestId("product-state-badge").textContent()) === "শীঘ্রই আসছে");
    await expect(page.getByTestId("product-purchase-panel").getByRole("button")).toHaveCount(0);
    await expect(page.getByTestId("product-unavailable-note")).toContainText("কোনো অর্ডার বা টাকা নেওয়া হয় না");
    const soonLd = await productJsonLd(page);
    expect(soonLd).toBeTruthy();
    expect(soonLd.offers).toBeUndefined();

    // Stock ended page: shown price + OutOfStock, and in-stock alternatives.
    await pollPage(page, `/products/${ended.slug}`, async () =>
      (await page.getByTestId("product-purchase-panel").getByTestId("product-state-badge").textContent()) === "স্টক শেষ");
    await expect(page.getByTestId("product-purchase-panel").getByRole("button")).toHaveCount(0);
    const endedLd = await productJsonLd(page);
    expect(endedLd.offers.availability).toBe("https://schema.org/OutOfStock");
    expect(endedLd.offers.priceCurrency).toBe("BDT");
    await expect(page.getByRole("heading", { name: "স্টকে থাকা বিকল্প পণ্য" })).toBeVisible();
    await expect(page.locator('section:has(h2:text("স্টকে থাকা বিকল্প পণ্য")) [data-product-state="in_stock"]').first()).toBeVisible();

    // A stock-ended product left in a cart cannot be checked out.
    await page.evaluate(([key, id]) => window.localStorage.setItem(key, JSON.stringify([{ productId: id, quantity: 1 }])), ["shoppilot-cart-v1", ended.id]);
    await page.goto("/cart");
    await expect(page.getByText(/কার্টের .+টি পণ্য এখন পাওয়া যাচ্ছে না/)).toBeVisible();

    // A never-stocked product's link is a plain 404.
    await expect.poll(async () => (await page.goto(`/products/${never!.slug}`))?.status(), { timeout: 150_000, intervals: [3_000] }).toBe(404);

    // Hiding a real product: "এখন পাওয়া যাচ্ছে না", noindex, no Product JSON-LD.
    await update(request, ended.slug, [["active", "false"]]);
    await pollPage(page, `/products/${ended.slug}`, async () => (await page.getByTestId("product-unavailable-page").count()) === 1);
    await expect(page.getByRole("heading", { level: 1, name: ended.name })).toBeVisible();
    await expect(page.getByText("এই পণ্যটা এখন পাওয়া যাচ্ছে না।")).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    expect(await productJsonLd(page)).toBeNull();
  } finally {
    await update(request, soon.slug, [["availability", "available"], ["estimated", ""], ["age_min", ""], ["age_max", ""], ["stock", String(soon.stock_quantity)]]);
    await update(request, ended.slug, [["active", "true"], ["stock", String(ended.stock_quantity)]]);
    await update(request, never!.slug, [["stock", String(never!.stock_quantity)]]);
    await page.evaluate((key) => window.localStorage.removeItem(key), "shoppilot-cart-v1").catch(() => {});
  }
});
