import { expect, test, type APIRequestContext } from "@playwright/test";

// R6.1: product page — price and COD button on a phone's first screen, video first,
// problem line, Bangla trust marks. Also the header logo loads eagerly.
const fixture = () => `http://127.0.0.1:${process.env.E2E_FIXTURE_PORT}`;

async function update(request: APIRequestContext, slug: string, fields: [string, string][]) {
  const response = await request.post(`${fixture()}/test/product-update?${new URLSearchParams([["slug", slug], ...fields])}`);
  expect(response.status(), await response.text()).toBe(200);
}

test("price and the COD order button are on a phone's first screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/products");
  const card = page.locator('[data-testid="product-card"][data-product-state="in_stock"]').first();
  await card.locator('a[href^="/products/"]').first().click();
  const panel = page.getByTestId("product-purchase-panel");
  const buy = panel.getByRole("button", { name: "এখনই অর্ডার করুন (COD)" });
  await expect(buy).toBeVisible();
  const box = await buy.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  const price = await panel.getByTestId("product-price").boundingBox();
  expect(price!.y + price!.height).toBeLessThanOrEqual(844);

  const marks = panel.getByTestId("product-trust-marks");
  await expect(marks).toContainText("ক্যাশ অন ডেলিভারি");
  await expect(marks).toContainText("পণ্য দেখে টাকা দিন");
  await expect(marks.getByRole("link", { name: "ভাঙা/ভুল/অসম্পূর্ণ পণ্য? ডেলিভারির ৭২ ঘণ্টার মধ্যে জানান" })).toHaveAttribute("href", "/return-policy");
  for (const old of ["Fast delivery", "Secure payment", "Easy support"]) await expect(panel).not.toContainText(old);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  // The logo is above the fold on every page, so it must not wait for lazy loading.
  await expect(page.locator('header img[src*="icon.svg"]')).toHaveAttribute("loading", "eager");
});

test("a product video comes first as a link, with the problem line", async ({ page, request }) => {
  test.skip(process.env.E2E_ISOLATED !== "1", "Catalog changes run only against the disposable local database.");
  test.setTimeout(300_000);
  const rows: { slug: string; stock_quantity: number }[] = await (await request.get(`${fixture()}/rest/v1/products?is_active=eq.true`)).json();
  const target = rows.filter((row) => row.stock_quantity > 0).sort((a, b) => a.slug.localeCompare(b.slug)).at(-1)!;
  try {
    await update(request, target.slug, [["video", "https://www.youtube.com/watch?v=abc123"], ["tags", "kitchen-clutter"]]);
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect.poll(async () => {
      await page.goto(`/products/${target.slug}`);
      return page.getByTestId("product-video-link").count();
    }, { timeout: 150_000, intervals: [3_000] }).toBe(1);

    const video = page.getByTestId("product-video-link");
    await expect(video).toHaveAttribute("href", "https://www.youtube.com/watch?v=abc123");
    await expect(video).toHaveAttribute("target", "_blank");
    await expect(video).toHaveAttribute("rel", /noopener/);
    await expect(video).toContainText("YouTube-এ খুলবে");
    // No third-party player is embedded until the customer clicks.
    await expect(page.locator('iframe[src*="youtube"], iframe[src*="facebook"]')).toHaveCount(0);
    // On desktop the video sits above the photos, on the left.
    const videoBox = (await video.boundingBox())!;
    const galleryBox = (await page.getByTestId("product-gallery-main").boundingBox())!;
    expect(videoBox.y).toBeLessThan(galleryBox.y);
    expect(videoBox.x).toBeLessThan((await page.getByTestId("product-purchase-panel").boundingBox())!.x);
    await expect(page.getByTestId("product-problem-line")).toHaveText("সমস্যা: রান্নাঘর গোছানো থাকে না");
  } finally {
    await update(request, target.slug, [["video", ""], ["tags", ""]]);
  }
});
