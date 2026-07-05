import { expect, test } from "@playwright/test";

async function clearCart(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
}

test.describe("storefront cart smoke", () => {
  test.beforeEach(async ({ page }) => {
    await clearCart(page);
  });

  test("adds an available product to cart and reaches checkout without creating an order", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByRole("heading", { name: "Shop All Products" })).toBeVisible();

    const addButtons = page.getByTestId("add-to-cart-button");
    const buttonCount = await addButtons.count();
    expect(buttonCount).toBeGreaterThan(0);

    let clicked = false;
    for (let index = 0; index < buttonCount; index += 1) {
      const button = addButtons.nth(index);
      if (await button.isEnabled()) {
        await button.click();
        clicked = true;
        break;
      }
    }

    expect(clicked).toBe(true);
    await expect(page.getByTestId("cart-count")).toHaveText("1");

    await page.getByTestId("cart-link").click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByRole("heading", { name: "Review Your Items" })).toBeVisible();
    await expect(page.getByTestId("cart-line")).toHaveCount(1);

    await page.getByTestId("cart-checkout-link").click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByRole("heading", { name: "Complete Your Order" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Place Order" })).toBeEnabled();
  });
});