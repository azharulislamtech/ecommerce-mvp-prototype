import { expect, test } from "@playwright/test";

test.describe("tracking and admin guard smoke", () => {
  test("shows safe empty and not-found states for public order tracking", async ({ page }) => {
    await page.goto("/track-order");
    await expect(page.getByRole("heading", { name: "আপনার অর্ডার কোথায় আছে দেখুন" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "অর্ডারের তথ্য দিন" })).toBeVisible();

    await page.getByLabel("অর্ডার নম্বর").fill("SP-DOES-NOT-EXIST");
    await page.getByLabel("মোবাইল নম্বর").fill("01700000000");
    await page.getByRole("button", { name: "অর্ডার খুঁজুন" }).click();

    await expect(page).toHaveURL(/\/track-order\?order=SP-DOES-NOT-EXIST&phone=01700000000/);
    await expect(page.getByRole("heading", { name: "অর্ডার পাওয়া যায়নি" })).toBeVisible();
    await expect(page.getByText("SP-1028")).toHaveCount(0);
  });

  test("keeps admin dashboard and orders behind login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login\?reason=auth-required$/);
    await expect(page.getByRole("heading", { name: "Admin Login" })).toBeVisible();

    await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/admin\/login\?reason=auth-required$/);
    await expect(page.getByRole("heading", { name: "Admin Login" })).toBeVisible();
  });
});