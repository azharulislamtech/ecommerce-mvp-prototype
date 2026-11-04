import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// R2.1 / R2.2: Bangla header strip, section menu that appears only with real products,
// Kids category menu, and the Bangla footer.
const RETURN_LINE = "ভাঙা/ভুল/অসম্পূর্ণ পণ্য? ডেলিভারির ৭২ ঘণ্টার মধ্যে জানান";
const fixture = () => `http://127.0.0.1:${process.env.E2E_FIXTURE_PORT}`;
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test("header strip, search and footer are Bangla on every page and fit a 390px phone", async ({ page }) => {
  for (const path of ["/", "/return-policy", "/products"]) {
    await page.goto(path);
    const strip = page.getByTestId("header-strip");
    await expect(strip).toContainText("ডেলিভারি: ঢাকায় ৳60, ঢাকার বাইরে ৳120");
    await expect(strip).toContainText("ক্যাশ অন ডেলিভারি");
    await expect(strip).toContainText("পণ্য দেখে টাকা দিন");
    await expect(strip.getByRole("link", { name: RETURN_LINE })).toHaveAttribute("href", "/return-policy");
    await expect(strip.getByRole("link", { name: "০১৭১৭-১২১৮৩৯" })).toHaveAttribute("href", "tel:+8801717121839");
    await expect(page.locator("body")).not.toContainText("৭ দিনে রিটার্ন");
  }

  const footer = page.getByTestId("site-footer");
  for (const heading of ["কেনাকাটা", "সাহায্য", "যোগাযোগ"]) {
    await expect(footer.getByRole("heading", { name: heading })).toBeVisible();
  }
  await expect(footer.getByRole("link", { name: "রিটার্ন ও টাকা ফেরতের নীতি" })).toHaveAttribute("href", "/return-policy");
  await expect(footer.getByRole("link", { name: "গোপনীয়তা নীতি" })).toHaveAttribute("href", "/privacy-policy");
  await expect(footer).not.toContainText("Important Links");

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByPlaceholder("পণ্য বা সমস্যা লিখে খুঁজুন…").first()).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("header-strip")).toBeVisible();
  expect(await noOverflow(page)).toBe(true);
  await page.getByTestId("mobile-menu-button").click();
  await expect(page.getByTestId("mobile-menu").getByRole("link", { name: "সব পণ্য" })).toBeVisible();
  await expect(page.getByTestId("mobile-menu").getByRole("link", { name: "অর্ডার ট্র্যাক" })).toBeVisible();
});

async function update(request: APIRequestContext, slug: string, fields: [string, string][]) {
  const response = await request.post(`${fixture()}/test/product-update?${new URLSearchParams([["slug", slug], ...fields])}`);
  expect(response.status(), await response.text()).toBe(200);
}

test("section menu links appear only when real products are behind them", async ({ page, request }) => {
  test.skip(process.env.E2E_ISOLATED !== "1", "Catalog changes run only against the disposable local database.");
  test.setTimeout(300_000);
  const menu = page.getByTestId("main-menu");
  await page.goto("/");
  // The seeded demo catalog has no section products and nothing coming soon.
  await expect(menu.getByRole("link", { name: "সব পণ্য" })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Kids & Baby" })).toHaveCount(0);
  await expect(menu.getByRole("link", { name: "শীঘ্রই আসছে" })).toHaveCount(0);

  const rows: { slug: string; stock_quantity: number; category_id: string }[] =
    await (await request.get(`${fixture()}/rest/v1/products?is_active=eq.true`)).json();
  const categories: { id: string; slug: string }[] = await (await request.get(`${fixture()}/rest/v1/categories`)).json();
  const inStock = rows.filter((row) => row.stock_quantity > 0).sort((a, b) => b.slug.localeCompare(a.slug));
  const [kids, soon] = inStock;
  const slugOf = (id: string) => categories.find((c) => c.id === id)!.slug;
  try {
    await update(request, kids.slug, [["category", "kids-education"]]);
    await update(request, soon.slug, [["stock", "0"], ["availability", "coming_soon"]]);

    await expect.poll(async () => {
      await page.goto("/");
      return (await menu.getByRole("link", { name: "Kids & Baby" }).count()) + (await menu.getByRole("link", { name: "শীঘ্রই আসছে" }).count());
    }, { timeout: 150_000, intervals: [3_000] }).toBe(2);
    await expect(menu.getByRole("link", { name: "সংসারের সমাধান" })).toHaveCount(0);
    await expect(page.getByTestId("site-footer").getByRole("link", { name: "Kids & Baby" })).toBeVisible();

    await menu.getByRole("link", { name: "Kids & Baby" }).click();
    // R4.1: the menu now opens the Kids page.
    await expect(page).toHaveURL(/\/kids$/);
    await expect(page.getByRole("heading", { level: 1, name: "খেলতে খেলতে শেখা, নিরাপদে বেড়ে ওঠা" })).toBeVisible();
    await expect(page.getByTestId("kids-products").getByTestId("product-card")).toHaveCount(1);
    // The section filter on /products still works, with its light-blue category menu.
    await page.goto("/products?section=kids");
    await expect(page.getByTestId("menu-section-title")).toHaveText("Kids & Baby");
    await expect(page.getByTestId("kids-category-menu").getByRole("link", { name: "শিশুদের শিক্ষা" })).toBeVisible();
    await expect(page.locator('[data-testid="product-card"]')).toHaveCount(1);

    await page.goto("/");
    await menu.getByRole("link", { name: "শীঘ্রই আসছে" }).click();
    await expect(page.getByTestId("menu-section-title")).toHaveText("শীঘ্রই আসছে");
    await expect(page.locator('[data-testid="product-card"][data-product-state="coming_soon"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="product-card"][data-product-state="in_stock"]')).toHaveCount(0);
  } finally {
    await update(request, kids.slug, [["category", slugOf(kids.category_id)]]);
    await update(request, soon.slug, [["availability", "available"], ["stock", String(soon.stock_quantity)]]);
  }
});
