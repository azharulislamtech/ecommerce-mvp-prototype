import { expect, test, type Page } from "@playwright/test";

// R10.1: V11 fields in the admin product form.
async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test.beforeEach(() => {
  test.skip(process.env.E2E_ISOLATED !== "1", "Admin sign-in runs only against the disposable local database.");
});

test("new product form shows the storefront fields and section categories", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/products/new");
  const fields = page.getByTestId("storefront-fields");
  for (const label of ["Estimated price (coming soon only)", "Minimum age (months)", "Maximum age (months)", "Problem tags", "Learning goals", "Video link"]) {
    await expect(fields.getByLabel(label, { exact: true })).toBeVisible();
  }
  // A label that wraps a <select> also contains its option text, so selects are found by name.
  const availability = fields.locator('select[name="availability"]');
  await expect(availability).toBeVisible();
  await expect(availability.locator("option")).toHaveText([
    "Available (sell when stock is above 0)", "Coming soon (stock must be 0)"
  ]);
  const category = page.locator('select[name="category_id"]');
  await expect(availability).toHaveAccessibleDescription(/Choose Coming soon only/);
  await expect(category.locator('optgroup[label="Kids & Baby"] option').first()).toHaveText("Kids & Baby (section, choose a sub-category)");
  expect(await category.locator('optgroup[label="Kids & Baby"] option').first().evaluate((el) => (el as HTMLOptionElement).disabled)).toBe(true);
  await expect(category.locator('optgroup[label="Kids & Baby"]')).toContainText("Kids & Baby › শিশুদের শিক্ষা (inactive)");
  await expect(category.locator('optgroup[label="সংসারের সমাধান · Home Solutions"]')).toContainText("সংসারের সমাধান › রান্নাঘর");
});

test("invalid storefront fields are refused with a message and the typed values stay", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/products/new");
  await page.getByLabel("Product Name", { exact: true }).fill("R10 test product");
  const category = page.locator('select[name="category_id"]');
  const kidsEducation = await category.locator("option", { hasText: "শিশুদের শিক্ষা" }).getAttribute("value");
  await category.selectOption(kidsEducation!);
  await page.getByLabel("Price", { exact: true }).fill("500");
  await page.getByLabel("Short Description", { exact: true }).fill("A short test description");
  await page.getByLabel("Full Description", { exact: true }).fill("A full description long enough for the form.");
  await page.getByLabel("Problem tags", { exact: true }).fill("small-space");
  await page.getByLabel("Minimum age (months)", { exact: true }).fill("72");
  await page.getByLabel("Maximum age (months)", { exact: true }).fill("36");
  // type="url" accepts this, the server rule does not (YouTube/Facebook only).
  await page.getByLabel("Video link", { exact: true }).fill("https://vimeo.com/123");
  await page.getByRole("button", { name: "Create Product" }).click();
  await expect(page.getByText("Please fix the highlighted product fields.")).toBeVisible();
  await expect(page.getByText("Use an https YouTube (watch, shorts, youtu.be) or Facebook video link.")).toBeVisible();
  await expect(page.getByText("Maximum age cannot be lower than minimum age.")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/products\/new$/);
  await expect(page.getByLabel("Product Name", { exact: true })).toHaveValue("R10 test product");
  await expect(page.getByLabel("Problem tags", { exact: true })).toHaveValue("small-space");
  await expect(page.getByLabel("Video link", { exact: true })).toHaveValue("https://vimeo.com/123");
});

// R10.2: guideline checklist and live warnings beside the form.
test("the guideline panel warns about claims and discounts and follows the section", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/products/new");
  const guide = page.getByTestId("listing-guide");
  const warnings = page.getByTestId("listing-warnings");
  await expect(guide.getByRole("heading", { name: "গাইডলাইন যাচাই" })).toBeVisible();
  await expect(warnings).toContainText("এখন কোনো সতর্কবার্তা নেই।");
  await expect(guide).toContainText("ভিডিওতে ব্যাকগ্রাউন্ড মিউজিক নেই");

  await page.getByLabel("Full Description", { exact: true }).fill("শক্ত কাঠের পাজল, non-toxic রং।");
  await expect(warnings).toContainText('"non-toxic" লেখা আছে');
  await page.getByLabel("Discount Price", { exact: true }).fill("400");
  await expect(warnings).toContainText('বানানো "আগের দাম" নয়');

  const category = page.locator('select[name="category_id"]');
  const kitchen = await category.locator("option", { hasText: "রান্নাঘর" }).getAttribute("value");
  await category.selectOption(kitchen!);
  await expect(guide.getByRole("heading", { name: "সংসারের সমাধান" })).toBeVisible();
  await expect(warnings).toContainText("অন্তত একটা সমস্যা ট্যাগ দিন");
  await page.getByLabel("Problem tags", { exact: true }).fill("small-space");
  await expect(warnings).not.toContainText("সমস্যা ট্যাগ দিন");

  const kids = await category.locator("option", { hasText: "শিশুদের শিক্ষা" }).getAttribute("value");
  await category.selectOption(kids!);
  await expect(guide.getByRole("heading", { name: "শিশুদের শিক্ষা" })).toBeVisible();
  await expect(guide.getByRole("heading", { name: "সংসারের সমাধান" })).toHaveCount(0);
});
