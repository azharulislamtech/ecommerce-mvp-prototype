import { expect, test, type Page } from "@playwright/test";

// R10.3: the admin can switch new-section categories on and off; legacy ones are read-only.
async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("a visitor who is not signed in as admin cannot reach the categories page", async ({ page }) => {
  await page.goto("/admin/categories");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole("heading", { name: "Admin Login" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Activate" })).toHaveCount(0);
});

test("the test database refuses a category write without the admin session", async ({ request }) => {
  test.skip(process.env.E2E_ISOLATED !== "1", "Uses the disposable local database.");
  const fixture = `http://127.0.0.1:${process.env.E2E_FIXTURE_PORT}`;
  const categories: { id: string; slug: string }[] = await (await request.get(`${fixture}/rest/v1/categories`)).json();
  const id = categories.find((c) => c.slug === "home-cleaning")!.id;
  const response = await request.patch(`${fixture}/rest/v1/categories?id=eq.${id}`, { data: { is_active: true } });
  expect(response.status()).toBe(403);
});

test("an admin activates and deactivates a new category, and the storefront follows", async ({ page, request }) => {
  test.skip(process.env.E2E_ISOLATED !== "1", "Admin writes run only against the disposable local database.");
  await signIn(page);
  await page.getByRole("link", { name: "Categories" }).click();
  await expect(page).toHaveURL(/\/admin\/categories$/);
  await expect(page.getByRole("heading", { level: 1, name: "Categories" })).toBeVisible();

  // Legacy demo categories are listed but cannot be switched here.
  const legacy = page.getByTestId("category-group-legacy");
  await expect(legacy.getByTestId("category-row-electronics")).toBeVisible();
  await expect(legacy.getByRole("button")).toHaveCount(0);

  const row = page.getByTestId("category-row-home-cleaning");
  await expect(row).toContainText("Inactive");
  await expect(row).toContainText("No in-stock products yet");
  expect((await request.get("/categories/home-cleaning")).status()).toBe(404);

  try {
    await row.getByRole("button", { name: "Activate" }).click();
    await expect(page.getByRole("status")).toContainText("is now active");
    await expect(page.getByTestId("category-row-home-cleaning")).toContainText("Active with no in-stock products");
    // The category page now renders, with its question and the honest empty note.
    await page.goto("/categories/home-cleaning");
    await expect(page.getByRole("heading", { level: 1, name: "ঘর পরিষ্কারে অনেক সময় যায়?" })).toBeVisible();
    await expect(page.getByTestId("category-empty")).toBeVisible();
  } finally {
    await page.goto("/admin/categories");
    const current = page.getByTestId("category-row-home-cleaning");
    if (await current.getByRole("button", { name: "Deactivate" }).count()) {
      await current.getByRole("button", { name: "Deactivate" }).click();
      await expect(page.getByRole("status")).toContainText("is now inactive");
    }
  }
  expect((await request.get("/categories/home-cleaning")).status()).toBe(404);
});
