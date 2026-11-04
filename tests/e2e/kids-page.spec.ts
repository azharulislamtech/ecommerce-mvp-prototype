import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// R4.1: Kids & Baby page — age buttons, learning tiles with real counts, coming soon,
// filtered list. Nothing shows without in-stock products behind it.
const fixture = () => `http://127.0.0.1:${process.env.E2E_FIXTURE_PORT}`;
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

async function update(request: APIRequestContext, slug: string, fields: [string, string][]) {
  const response = await request.post(`${fixture()}/test/product-update?${new URLSearchParams([["slug", slug], ...fields])}`);
  expect(response.status(), await response.text()).toBe(200);
}

test("an empty Kids page is honest, noindex and fits a phone", async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 390, height: 844 });
  // Earlier tests may move products into Kids and back; wait for the 60 s ISR page.
  await expect.poll(async () => {
    await page.goto("/kids");
    return page.getByTestId("kids-empty-note").count();
  }, { timeout: 150_000, intervals: [3_000] }).toBe(1);
  await expect(page.getByRole("heading", { level: 1, name: "খেলতে খেলতে শেখা, নিরাপদে বেড়ে ওঠা" })).toBeVisible();
  for (const id of ["kids-ages", "kids-goals", "kids-products", "kids-coming-soon"]) await expect(page.getByTestId(id)).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByTestId("kids-trust")).toContainText("নিরাপত্তা যাচাই");
  expect(await noOverflow(page)).toBe(true);
});

test("age buttons and learning tiles follow real Kids products", async ({ page, request }) => {
  test.skip(process.env.E2E_ISOLATED !== "1", "Catalog changes run only against the disposable local database.");
  test.setTimeout(300_000);
  const rows: { slug: string; stock_quantity: number; category_id: string; name: string }[] =
    await (await request.get(`${fixture()}/rest/v1/products?is_active=eq.true`)).json();
  const categories: { id: string; slug: string }[] = await (await request.get(`${fixture()}/rest/v1/categories`)).json();
  const inStock = rows.filter((row) => row.stock_quantity > 0).sort((a, b) => a.slug.localeCompare(b.slug));
  const [young, older, soon] = inStock;
  const slugOf = (id: string) => categories.find((c) => c.id === id)!.slug;
  try {
    await update(request, young.slug, [["category", "kids-education"], ["age_min", "36"], ["age_max", "48"], ["goals", "letters-words"]]);
    await update(request, older.slug, [["category", "kids-education"], ["age_min", "48"], ["age_max", "72"], ["goals", "letters-words,numbers-counting"]]);
    await update(request, soon.slug, [["category", "kids-education"], ["stock", "0"], ["availability", "coming_soon"]]);

    await expect.poll(async () => {
      await page.goto("/kids");
      return page.getByTestId("kids-products").getByTestId("product-card").count();
    }, { timeout: 150_000, intervals: [3_000] }).toBe(2);

    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    const ages = page.getByTestId("kids-ages");
    await expect(ages.getByRole("link")).toHaveText(["সব বয়স", "৩–৪ বছর", "৪–৫ বছর", "৫–৬ বছর"]);
    const goals = page.getByTestId("kids-goals");
    await expect(goals.getByRole("link")).toHaveCount(2);
    await expect(goals.getByRole("link", { name: /অক্ষর ও শব্দ/ }).getByTestId("kids-goal-count")).toHaveText("২টি পণ্য");
    await expect(goals.getByRole("link", { name: /সংখ্যা ও গণনা/ }).getByTestId("kids-goal-count")).toHaveText("১টি পণ্য");
    await expect(page.getByTestId("kids-coming-soon").getByTestId("product-card")).toHaveCount(1);
    await expect(page.getByTestId("kids-products").getByTestId("product-learning-line").first()).toContainText("শেখায়:");

    await ages.getByRole("link", { name: "৩–৪ বছর" }).click();
    await expect(page).toHaveURL(/\/kids\?age=3-4#products$/);
    await expect(page.getByTestId("kids-products").getByTestId("product-card")).toHaveCount(1);
    await expect(page.getByTestId("kids-products")).toContainText(young.name);

    await page.goto("/kids");
    await goals.getByRole("link", { name: /সংখ্যা ও গণনা/ }).click();
    await expect(page).toHaveURL(/goal=numbers-counting/);
    await expect(page.getByTestId("kids-products").getByTestId("product-card")).toHaveCount(1);
    await expect(page.getByTestId("kids-products")).toContainText(older.name);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

    // Age and goal together with nothing in common: an honest empty message with a reset.
    await page.goto("/kids?age=3-4&goal=numbers-counting");
    await expect(page.getByTestId("kids-products")).toContainText("এই বাছাইয়ে কোনো পণ্য নেই।");
  } finally {
    for (const row of [young, older]) {
      await update(request, row.slug, [["category", slugOf(row.category_id)], ["age_min", ""], ["age_max", ""], ["goals", ""]]);
    }
    await update(request, soon.slug, [["category", slugOf(soon.category_id)], ["availability", "available"], ["stock", String(soon.stock_quantity)]]);
  }
});
