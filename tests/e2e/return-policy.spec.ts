import { expect, test } from "@playwright/test";

// R2.5: one return rule everywhere — 72 hours from delivery, open-box before paying.
const RETURN_LINE = "ভাঙা/ভুল/অসম্পূর্ণ পণ্য? ডেলিভারির ৭২ ঘণ্টার মধ্যে জানান";

test("return policy is Bangla, says 72 hours and fits a 390px phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/return-policy");
  await expect(page.getByRole("heading", { level: 1, name: "রিটার্ন ও টাকা ফেরতের নীতি" })).toBeVisible();
  await expect(page.getByTestId("return-window")).toHaveText(RETURN_LINE);
  await expect(page.getByRole("heading", { name: "পণ্য দেখে টাকা দিন" })).toBeVisible();
  await expect(page.getByText("৭ কর্মদিবসের মধ্যে")).toBeVisible();
  const body = page.locator("body");
  for (const banned of ["৭ দিনে রিটার্ন", "48 hours", "৪৮ ঘণ্টা", "whenever possible", "যেখানে সম্ভব"]) {
    await expect(body).not.toContainText(banned);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("product page repeats the same return line and links the policy", async ({ page }) => {
  await page.goto("/products");
  const card = page.locator('a[href^="/products/"]').first();
  test.skip((await card.count()) === 0, "No visible products in this catalog.");
  await card.click();
  const line = page.getByTestId("product-return-line");
  await expect(line).toContainText(RETURN_LINE);
  await expect(line.getByRole("link", { name: "রিটার্ন নীতি দেখুন" })).toHaveAttribute("href", "/return-policy");
  // innerText skips the JSON-LD script, which keeps "BDT" for search engines.
  await expect(page.locator("body")).not.toContainText("BDT", { useInnerText: true });
});
