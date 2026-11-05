import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// R11.2 (গ): Bangla language, contrast (4.5:1), labels, alt text and accessible names on every
// main store page, checked by axe (WCAG 2.1 AA) at phone width, plus 44px tap targets for
// buttons, form fields and stand-alone links (links inside a sentence are exempt, as in WCAG).
const PAGES = ["/", "/products", "/kids", "/cart", "/checkout", "/track-order", "/return-policy", "/privacy-policy", "/terms"];

async function axe(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return result.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
}

async function smallTargets(page: Page) {
  return page.evaluate(() => {
    const small: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("main button, main input:not([type=hidden]), main select, main textarea, main a, header a, header button"))) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || el.closest("[aria-hidden=true]") || el.classList.contains("hidden")) continue;
      // Links that sit inside running text are exempt (WCAG 2.5.8 inline exception).
      if (el.tagName === "A" && el.closest("p, li, dd, nav[aria-label='অবস্থান']") && !el.className.includes("min-h")) continue;
      if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
        const label = el.closest("label");
        const box = (label ?? el).getBoundingClientRect();
        if (box.height < 24) small.push(`${el.outerHTML.slice(0, 80)} (${Math.round(box.height)}px)`);
        continue;
      }
      const box = el.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      if (box.height < 44 - 0.5) small.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? el.getAttribute("aria-label") ?? "").trim().slice(0, 30)}" ${Math.round(box.width)}x${Math.round(box.height)}`);
    }
    return small;
  });
}

test.describe("accessibility at phone width", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const path of PAGES) {
    test(`${path} passes axe and has 44px tap targets`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("lang", "bn");
      expect(await axe(page), "axe violations").toEqual([]);
      expect(await smallTargets(page), "tap targets under 44px").toEqual([]);
    });
  }

  test("a product page passes axe and has 44px tap targets", async ({ page }) => {
    await page.goto("/products");
    const link = page.locator('[data-testid="product-card"] a[href^="/products/"]').first();
    await page.goto((await link.getAttribute("href"))!);
    expect(await axe(page), "axe violations").toEqual([]);
    expect(await smallTargets(page), "tap targets under 44px").toEqual([]);
  });
});

test("the store can be used with the keyboard alone: skip to content and a visible focus ring", async ({ page }) => {
  await page.goto("/products");
  await page.keyboard.press("Tab");
  const first = page.locator(":focus");
  await expect(first).toHaveText("মূল লেখায় যান");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
  // Tabbing reaches a product's buy button, and focus is visibly outlined.
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    if ((await page.locator(":focus").getAttribute("data-testid")) === "add-to-cart-button") break;
  }
  const focused = page.locator(":focus");
  await expect(focused).toHaveAttribute("data-testid", "add-to-cart-button");
  const outline = await focused.evaluate((el) => {
    const style = getComputedStyle(el);
    return style.outlineStyle !== "none" || style.boxShadow !== "none";
  });
  expect(outline).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("cart-count")).toHaveText("1");
});

test("the admin keeps English as its language", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.locator('[lang="en"]').first()).toBeVisible();
});
