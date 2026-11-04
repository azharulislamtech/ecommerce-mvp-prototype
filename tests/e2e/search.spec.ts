import { expect, test, type APIRequestContext } from "@playwright/test";

// R2.10: search in Bangla and English, by problem and learning goal; hidden products
// never appear; coming-soon results keep their badge; no match gives a Bangla message
// and popular products.
const fixture = () => `http://127.0.0.1:${process.env.E2E_FIXTURE_PORT}`;

async function update(request: APIRequestContext, slug: string, fields: [string, string][]) {
  const response = await request.post(`${fixture()}/test/product-update?${new URLSearchParams([["slug", slug], ...fields])}`);
  expect(response.status(), await response.text()).toBe(200);
}

test("a search with no match explains in Bangla and offers popular products", async ({ page }) => {
  await page.goto("/products?q=xyzzy-nothing");
  await expect(page.getByTestId("search-empty")).toContainText("“xyzzy-nothing” দিয়ে কোনো পণ্য পাওয়া যায়নি");
  await expect(page.getByTestId("search-popular").getByTestId("product-card").first()).toBeVisible();
  await expect(page.getByTestId("search-popular").locator('[data-product-state]:not([data-product-state="in_stock"])')).toHaveCount(0);
  await expect(page.getByPlaceholder("পণ্য বা সমস্যা লিখে খুঁজুন…").first()).toBeVisible();
});

test("Bangla and English words, problems and goals find products; hidden ones never do", async ({ page, request }) => {
  test.skip(process.env.E2E_ISOLATED !== "1", "Catalog changes run only against the disposable local database.");
  const rows: { slug: string; name: string; stock_quantity: number }[] =
    await (await request.get(`${fixture()}/rest/v1/products?is_active=eq.true`)).json();
  const inStock = rows.filter((row) => row.stock_quantity > 0).sort((a, b) => a.slug.localeCompare(b.slug));
  const [puzzle, cutter, soon, hidden] = inStock;
  const results = async (query: string) => {
    await page.goto(`/products?q=${encodeURIComponent(query)}`);
    // With no match the page shows a message plus popular products; those are not results.
    if (await page.getByTestId("search-empty").count()) return [];
    return page.locator('[data-testid="product-card"]').evaluateAll((cards) => cards.map((card) => card.getAttribute("data-product-id")));
  };
  const ids: Record<string, string> = Object.fromEntries(
    (await (await request.get(`${fixture()}/rest/v1/products`)).json()).map((row: { slug: string; id: string }) => [row.slug, row.id])
  );
  try {
    await update(request, puzzle.slug, [["name", "অক্ষর মেলাও পাজল"], ["goals", "letters-words"]]);
    await update(request, cutter.slug, [["name", "Multi Vegetable Cutter"], ["tags", "kitchen-clutter"]]);
    await update(request, soon.slug, [["name", "সংখ্যার পাজল"], ["stock", "0"], ["availability", "coming_soon"]]);
    await update(request, hidden.slug, [["name", "লুকানো পাজল"], ["active", "false"]]);

    for (const query of ["পাজল", "puzzle", "PUZZLE"]) {
      const found = await results(query);
      expect(found, query).toContain(ids[puzzle.slug]);
      expect(found, query).toContain(ids[soon.slug]);
      expect(found, query).not.toContain(ids[hidden.slug]);
    }
    // The coming-soon result keeps its badge and has no buy button.
    await results("সংখ্যার পাজল");
    const soonCard = page.locator(`[data-testid="product-card"][data-product-id="${ids[soon.slug]}"]`);
    await expect(soonCard.getByTestId("product-state-badge")).toHaveText("শীঘ্রই আসছে");
    await expect(soonCard.getByRole("button")).toHaveCount(0);

    expect(await results("কাটার")).toEqual([ids[cutter.slug]]);
    expect(await results("রান্নাঘর গোছানো")).toEqual([ids[cutter.slug]]);
    expect(await results("kitchen")).toContain(ids[cutter.slug]);
    expect(await results("অক্ষর ও শব্দ")).toEqual([ids[puzzle.slug]]);
    expect(await results("লুকানো")).toEqual([]);
  } finally {
    await update(request, puzzle.slug, [["name", puzzle.name], ["goals", ""]]);
    await update(request, cutter.slug, [["name", cutter.name], ["tags", ""]]);
    await update(request, soon.slug, [["name", soon.name], ["availability", "available"], ["stock", String(soon.stock_quantity)]]);
    await update(request, hidden.slug, [["name", hidden.name], ["active", "true"]]);
  }
});
