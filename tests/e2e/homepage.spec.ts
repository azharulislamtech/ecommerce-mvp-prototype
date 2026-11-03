import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// R3.1: honest Bangla homepage. Every block needs real products behind it.
const fixture = () => `http://127.0.0.1:${process.env.E2E_FIXTURE_PORT}`;
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

async function update(request: APIRequestContext, slug: string, fields: [string, string][]) {
  const response = await request.post(`${fixture()}/test/product-update?${new URLSearchParams([["slug", slug], ...fields])}`);
  expect(response.status(), await response.text()).toBe(200);
}

test("the homepage has no invented claims and hides blocks with nothing behind them", async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 390, height: 844 });
  // Earlier tests change the catalog and restore it; wait for the 60 s ISR page to catch up.
  await expect.poll(async () => {
    await page.goto("/");
    return page.locator('[data-testid^="home-"][data-testid$="-products"], [data-testid="home-section-cards"], [data-testid="home-problems"], [data-testid="home-coming-soon"]').count();
  }, { timeout: 150_000, intervals: [3_000] }).toBe(0);
  await expect(page.getByRole("heading", { level: 1, name: "শিশুদের শেখার জিনিস আর সংসারের সহজ সমাধান" })).toBeVisible();
  const body = page.locator("main");
  for (const text of ["24h", "Dispatch", "Your Trusted Shopping Partner", "Shop Now", "View Offers", "Featured Categories", "Why Buy From Us"]) {
    await expect(body).not.toContainText(text);
  }
  // The seeded catalog has no section, problem, video or coming-soon products.
  for (const id of ["home-section-cards", "home-problems", "home-kids-products", "home-home-products", "home-coming-soon"]) {
    await expect(page.getByTestId(id)).toHaveCount(0);
  }
  const trust = page.getByTestId("home-trust");
  await expect(trust).toContainText("ক্যাশ অন ডেলিভারি");
  await expect(trust).toContainText("সৎ তথ্য");
  await expect(trust).not.toContainText("ভিডিওসহ পণ্য");
  expect(await noOverflow(page)).toBe(true);
});

test("section cards, problem cards and product blocks appear with real products", async ({ page, request }) => {
  test.skip(process.env.E2E_ISOLATED !== "1", "Catalog changes run only against the disposable local database.");
  test.setTimeout(300_000);
  const rows: { slug: string; stock_quantity: number; category_id: string }[] =
    await (await request.get(`${fixture()}/rest/v1/products?is_active=eq.true`)).json();
  const categories: { id: string; slug: string }[] = await (await request.get(`${fixture()}/rest/v1/categories`)).json();
  const inStock = rows.filter((row) => row.stock_quantity > 0).sort((a, b) => a.slug.localeCompare(b.slug));
  const [kidsA, kidsB, soon] = inStock;
  const slugOf = (id: string) => categories.find((c) => c.id === id)!.slug;
  try {
    await update(request, kidsA.slug, [["category", "kids-education"], ["tags", "letters-learning"], ["video", "https://youtu.be/abc123"]]);
    await update(request, kidsB.slug, [["category", "kids-education"], ["tags", "letters-learning"]]);
    await update(request, soon.slug, [["stock", "0"], ["availability", "coming_soon"]]);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(async () => {
      await page.goto("/");
      return page.getByTestId("home-problems").count();
    }, { timeout: 150_000, intervals: [3_000] }).toBe(1);

    // On a phone the section card is on the first screen.
    const kidsCard = page.getByTestId("home-section-cards").getByRole("link", { name: /Kids & Baby/ });
    await expect(kidsCard).toBeVisible();
    expect((await kidsCard.boundingBox())!.y).toBeLessThan(844);
    await expect(page.getByTestId("home-section-cards").getByRole("link", { name: /সংসারের সমাধান/ })).toHaveCount(0);

    const problems = page.getByTestId("home-problems");
    await expect(problems.getByRole("link")).toHaveText(["অক্ষর শেখাতে কষ্ট হচ্ছে?"]);
    await expect(page.getByTestId("home-kids-products").getByTestId("product-card")).toHaveCount(2);
    await expect(page.getByTestId("home-kids-products").getByTestId("product-video-mark")).toHaveCount(1);
    await expect(page.getByTestId("home-coming-soon").getByTestId("product-card")).toHaveCount(1);
    await expect(page.getByTestId("home-trust")).toContainText("ভিডিওসহ পণ্য");
    expect(await noOverflow(page)).toBe(true);

    await problems.getByRole("link", { name: "অক্ষর শেখাতে কষ্ট হচ্ছে?" }).click();
    await expect(page).toHaveURL(/\/products\?tag=letters-learning$/);
    await expect(page.getByTestId("menu-section-title")).toHaveText("অক্ষর শেখাতে কষ্ট হচ্ছে?");
    await expect(page.getByTestId("product-card")).toHaveCount(2);
  } finally {
    for (const row of [kidsA, kidsB]) {
      await update(request, row.slug, [["category", slugOf(row.category_id)], ["tags", ""], ["video", ""]]);
    }
    await update(request, soon.slug, [["availability", "available"], ["stock", String(soon.stock_quantity)]]);
  }
});
