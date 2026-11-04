import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// R5.1: category pages — breadcrumb, question, sub-category chips, URL filters, sorting,
// and an honest message when a filter matches nothing.
const fixture = () => `http://127.0.0.1:${process.env.E2E_FIXTURE_PORT}`;
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

async function update(request: APIRequestContext, slug: string, fields: [string, string][]) {
  const response = await request.post(`${fixture()}/test/product-update?${new URLSearchParams([["slug", slug], ...fields])}`);
  expect(response.status(), await response.text()).toBe(200);
}

async function setCategory(request: APIRequestContext, slug: string, active: boolean) {
  expect((await request.post(`${fixture()}/test/category-active?slug=${slug}&active=${active}`)).status()).toBe(200);
}

test("a category page has Bangla filters in the URL and an honest empty-filter message", async ({ page, request }) => {
  const categories: { slug: string; is_active: boolean }[] = await (await request.get(`${fixture()}/rest/v1/categories?is_active=eq.true`)).json();
  // Pick a legacy category that has products.
  let slug = "";
  for (const category of categories) {
    await page.goto(`/categories/${category.slug}`);
    if ((await page.getByTestId("product-card").count()) > 0) { slug = category.slug; break; }
  }
  expect(slug, "a category with products").not.toBe("");

  await expect(page.getByTestId("category-breadcrumb")).toContainText("হোম ›");
  await expect(page.locator("main")).not.toContainText("will be available soon");
  const total = await page.getByTestId("product-card").count();
  await expect(page.getByTestId("category-count")).toContainText("টি পণ্য");

  // Sorting by price keeps every product and orders them low to high.
  await page.goto(`/categories/${slug}?sort=price-asc`);
  await expect(page.getByTestId("product-card")).toHaveCount(total);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  // A filter that matches nothing: message plus a clear-filter link back to the plain page.
  await page.goto(`/categories/${slug}?availability=coming_soon`);
  await expect(page.getByTestId("category-empty-filter")).toContainText("এই ফিল্টারে কোনো পণ্য নেই");
  await page.getByTestId("category-empty-filter").getByRole("link", { name: "ফিল্টার মুছুন" }).click();
  await expect(page).toHaveURL(new RegExp(`/categories/${slug}$`));
  await expect(page.getByTestId("product-card")).toHaveCount(total);

  // On a phone the filters sit behind one button.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/categories/${slug}`);
  await expect(page.getByTestId("category-filter-button")).toBeVisible();
  await page.getByTestId("category-filter-button").locator("summary").click();
  await expect(page.getByTestId("category-filter-button").getByRole("button", { name: "ফিল্টার দেখুন" })).toBeVisible();
  expect(await noOverflow(page)).toBe(true);
});

test("section pages show the question, in-stock chips and the Kids age filter", async ({ page, request }) => {
  test.skip(process.env.E2E_ISOLATED !== "1", "Catalog changes run only against the disposable local database.");
  test.setTimeout(300_000);
  const rows: { slug: string; stock_quantity: number; category_id: string; name: string }[] =
    await (await request.get(`${fixture()}/rest/v1/products?is_active=eq.true`)).json();
  const categories: { id: string; slug: string }[] = await (await request.get(`${fixture()}/rest/v1/categories`)).json();
  const inStock = rows.filter((row) => row.stock_quantity > 0).sort((a, b) => b.slug.localeCompare(a.slug));
  const [young, older] = inStock;
  const slugOf = (id: string) => categories.find((c) => c.id === id)!.slug;
  try {
    await setCategory(request, "kids-baby", true);
    await setCategory(request, "kids-education", true);
    await update(request, young.slug, [["category", "kids-education"], ["age_min", "36"], ["age_max", "48"]]);
    await update(request, older.slug, [["category", "kids-education"], ["age_min", "60"], ["age_max", "72"]]);

    await expect.poll(async () => {
      const response = await page.goto("/categories/kids-baby");
      return response?.status() === 200 ? page.getByTestId("product-card").count() : -1;
    }, { timeout: 150_000, intervals: [3_000] }).toBe(2);

    await expect(page.getByRole("heading", { level: 1, name: "খেলতে খেলতে শেখাবেন?" })).toBeVisible();
    await expect(page.getByTestId("category-chips").getByRole("link", { name: "শিশুদের শিক্ষা" })).toHaveAttribute("href", "/categories/kids-education");
    const filters = page.locator("aside").getByTestId("category-filters");
    await expect(filters.getByText("বাচ্চার বয়স")).toBeVisible();
    await expect(filters.getByLabel("৩–৪ বছর")).toBeVisible();
    await expect(filters.getByLabel("৫–৬ বছর")).toBeVisible();
    await expect(filters.getByLabel("৪–৫ বছর")).toHaveCount(0);
    await filters.getByLabel("৩–৪ বছর").check();
    await filters.getByRole("button", { name: "ফিল্টার দেখুন" }).click();
    await expect(page).toHaveURL(/age=3-4/);
    await expect(page.getByTestId("product-card")).toHaveCount(1);
    await expect(page.getByTestId("product-card")).toContainText(young.name);

    await page.goto("/categories/kids-education");
    await expect(page.getByTestId("category-breadcrumb")).toHaveText("হোম › Kids & Baby › শিশুদের শিক্ষা");
    await expect(page.getByRole("heading", { level: 1, name: "অক্ষর শেখাতে কষ্ট হচ্ছে?" })).toBeVisible();
  } finally {
    for (const row of [young, older]) await update(request, row.slug, [["category", slugOf(row.category_id)], ["age_min", ""], ["age_max", ""]]);
    await setCategory(request, "kids-education", false);
    await setCategory(request, "kids-baby", false);
  }
});
