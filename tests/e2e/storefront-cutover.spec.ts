import { expect, test, type APIRequestContext } from "@playwright/test";

// R1.8 / R2.8: the storefront right after V12, with the real migration file applied to the
// test database. Legacy category links redirect (301), dummy products are gone from every
// list and their links 404, the sitemap is clean, nothing dummy can be bought. The test
// rolls V12 back at the end, which also exercises the rollback.
const fixture = () => `http://127.0.0.1:${process.env.E2E_FIXTURE_PORT}`;

async function cutover(request: APIRequestContext, action: "apply" | "rollback") {
  const response = await request.post(`${fixture()}/test/catalog-cutover?action=${action}`);
  expect(response.status(), await response.text()).toBe(200);
  return response.json();
}

test("after V12 the store shows no dummy products and old links go to the right place", async ({ page, request }) => {
  test.skip(process.env.E2E_ISOLATED !== "1", "The cutover runs only against the disposable local database.");
  test.setTimeout(300_000);
  const before: { id: string; slug: string; first_stocked_at: string | null }[] =
    await (await request.get(`${fixture()}/rest/v1/products?is_active=eq.true`)).json();
  // V12 hides only never-stocked products. Earlier tests restock some seed rows, which
  // sets first_stocked_at, so those count as real and must stay: that is V12's guard.
  const dummies = before.filter((row) => row.first_stocked_at === null);
  const real = before.filter((row) => row.first_stocked_at !== null);
  expect(dummies.length).toBeGreaterThan(0);
  const dummy = dummies[0];

  const applied = await cutover(request, "apply");
  try {
    expect(applied.active_categories).toBe(0);

    // /products renders per request: no never-stocked product is listed; only rows that were
    // once in stock may remain. With none left, the page says so plainly.
    await page.goto("/products");
    const listed = await page.getByTestId("product-card").evaluateAll((cards) => cards.map((card) => card.getAttribute("data-product-id")));
    for (const row of dummies) expect(listed, row.slug).not.toContain(row.id);
    expect(listed.every((listedId) => real.some((row) => row.id === listedId))).toBe(true);
    if (listed.length === 0) {
      await expect(page.getByTestId("store-empty")).toContainText("এই মুহূর্তে বিক্রির জন্য কোনো পণ্য নেই");
    }

    // Old category links: 301 to the right place, in the same release.
    for (const [slug, target] of [["home-living", "/products?section=home"], ["electronics", "/"], ["beauty", "/"]]) {
      const response = await request.get(`/categories/${slug}`, { maxRedirects: 0 });
      expect(response.status(), slug).toBe(301);
      expect(response.headers()["location"], slug).toBe(target);
    }

    // A dummy product link is a plain 404 (never stocked, so no "এখন পাওয়া যাচ্ছে না" page).
    await expect.poll(async () => (await page.goto(`/products/${dummy.slug}`))?.status(), { timeout: 150_000, intervals: [3_000] }).toBe(404);

    // The sitemap lists no legacy category and no dummy product.
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const slug of ["electronics", "fashion", "home-living", "beauty", "accessories"]) expect(sitemap).not.toContain(`/categories/${slug}<`);
    for (const row of dummies) expect(sitemap).not.toContain(`/products/${row.slug}<`);

    // A dummy left in a cart cannot reach checkout.
    await page.goto("/");
    await page.evaluate(([key, id]) => window.localStorage.setItem(key, JSON.stringify([{ productId: id, quantity: 1 }])), ["shoppilot-cart-v1", dummy.id]);
    await page.goto("/cart");
    await expect(page.getByText(/কার্টের .+টি পণ্য এখন পাওয়া যাচ্ছে না/)).toBeVisible();
    await page.evaluate((key) => window.localStorage.removeItem(key), "shoppilot-cart-v1");

    // The header shows only the always-on links.
    const menu = page.getByTestId("main-menu");
    await expect(menu.getByRole("link")).toHaveText(["সব পণ্য", "অর্ডার ট্র্যাক"]);
  } finally {
    const rolledBack = await cutover(request, "rollback");
    expect(rolledBack.active_categories).toBe(5);
  }
  const after: { id: string }[] = await (await request.get(`${fixture()}/rest/v1/products?is_active=eq.true`)).json();
  expect(after.map((row) => row.id).sort()).toEqual(before.map((row) => row.id).sort());
});
