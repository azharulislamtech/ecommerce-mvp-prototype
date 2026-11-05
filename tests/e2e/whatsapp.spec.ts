import { expect, test, type Page } from "@playwright/test";

// R9.1: subscribe with versioned consent; the owner records replies, opts out, and reactivates
// only after re-consent; the website form never switches an opted-out number back on.
const PHONE = "01955443322";

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

async function subscribe(page: Page) {
  await page.goto("/kids");
  const box = page.getByTestId("whatsapp-subscribe");
  await box.getByLabel("মোবাইল নম্বর (WhatsApp)").fill(PHONE);
  await box.getByRole("checkbox").check();
  await box.getByRole("button", { name: "খবর পেতে চাই" }).click();
  await expect(page.getByTestId("whatsapp-thanks")).toContainText("ধন্যবাদ!", { timeout: 30_000 });
}

test("the subscribe form shows the consent text and needs the tick", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/kids");
  const box = page.getByTestId("whatsapp-subscribe");
  await expect(box.getByTestId("whatsapp-consent-text")).toContainText("মাসে সর্বোচ্চ ২–৪টি মেসেজ");
  await expect(box.getByRole("checkbox")).toHaveAttribute("required", "");
  await expect(box.getByRole("link", { name: "গোপনীয়তা নীতি" })).toHaveAttribute("href", "/privacy-policy");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("subscribe, reply, opt out, re-consent and reactivate, delete", async ({ page }) => {
  test.skip(process.env.E2E_ISOLATED !== "1", "Writes run only against the disposable local database.");
  test.setTimeout(180_000);
  await subscribe(page);

  await signIn(page);
  await page.getByRole("link", { name: "WhatsApp", exact: true }).click();
  const active = page.getByTestId("whatsapp-active");
  await expect(page.getByTestId("whatsapp-copy-list")).toContainText(PHONE);
  const row = () => page.getByTestId("whatsapp-row").filter({ hasText: PHONE });
  await expect(row()).toContainText("wa-2026-11-v1");

  await row().getByRole("button", { name: "They replied today" }).click();
  await expect(page.getByRole("status")).toContainText("Last response saved.");
  await expect(row()).not.toContainText("Last response —");

  await row().getByRole("button", { name: "Opt out" }).click();
  await expect(page.getByRole("status")).toContainText("broadcast list");
  await expect(active).not.toContainText(PHONE);
  await expect(page.getByTestId("whatsapp-opted-out")).toContainText(PHONE);

  // Someone types the number again on the website: it is NOT reactivated, only flagged.
  await subscribe(page);
  await page.goto("/admin/whatsapp");
  await expect(page.getByTestId("whatsapp-active")).not.toContainText(PHONE);
  await expect(page.getByTestId("whatsapp-pending")).toContainText(PHONE);

  // After they message the shop, the owner reactivates with new consent.
  await row().getByRole("button", { name: "They messaged us: reactivate" }).click();
  await expect(page.getByRole("status")).toContainText("Number reactivated with new consent.");
  await expect(page.getByTestId("whatsapp-active")).toContainText(PHONE);

  await row().getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("status")).toContainText("Number deleted.");
  await expect(page.getByTestId("whatsapp-row").filter({ hasText: PHONE })).toHaveCount(0);
});
