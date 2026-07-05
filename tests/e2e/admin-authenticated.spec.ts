import { expect, test } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

test.describe("authenticated admin smoke", () => {
  test.skip(!adminEmail || !adminPassword, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run authenticated admin smoke tests.");

  test("signs in and verifies dashboard/order management surfaces", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(adminEmail ?? "");
    await page.getByLabel("Password").fill(adminPassword ?? "");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Store Overview" })).toBeVisible();
    await expect(page.getByText("Recent Orders")).toBeVisible();
    await expect(page.getByText("Low Stock Products")).toBeVisible();

    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { name: "Order Management" })).toBeVisible();
  });
});