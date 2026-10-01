import { expect, test, type Page } from "@playwright/test";

const WIDTHS = [390, 768, 1440] as const;
const APP_PATHS = [
  "/dashboard",
  "/estimates/new",
  "/estimates",
  "/leads",
  "/storms",
  "/customers",
  "/claims",
  "/settings/matrix",
];

async function signIn(page: Page) {
  await page.goto("/login");
  await page.locator("#email").fill("admin@ntxhail.local");
  await page.locator("#password").fill("HailOps!admin");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"));
}

async function overflowPx(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

test.describe("no horizontal page overflow", () => {
  for (const width of WIDTHS) {
    test(`login @ ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/login");
      expect(await overflowPx(page)).toBeLessThanOrEqual(1);
    });

    test(`app pages @ ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await signIn(page);
      for (const path of APP_PATHS) {
        await page.goto(path);
        await page.waitForLoadState("domcontentloaded");
        expect(await overflowPx(page), `${path} @ ${width}`).toBeLessThanOrEqual(1);
      }
    });
  }
});

test.describe("estimate chrome stays in viewport", () => {
  for (const width of WIDTHS) {
    const height = width === 390 ? 844 : 900;
    test(`save bar clears the car @ ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await signIn(page);
      await page.goto("/estimates/new");
      const done = page.getByRole("button", { name: "Done" });
      if (await done.isVisible()) await done.click();
      await page.waitForSelector("[data-vehicle-map=HAILSPEC]");
      const overlap = await page.evaluate(() => {
        const car = document.querySelector("[data-vehicle-map=HAILSPEC]");
        const bar = document.querySelector("[data-save-bar]");
        if (!car || !bar) return 999;
        return car.getBoundingClientRect().bottom - bar.getBoundingClientRect().top;
      });
      expect(overlap, `car overlaps save bar by ${overlap}px`).toBeLessThanOrEqual(2);
      expect(await overflowPx(page)).toBeLessThanOrEqual(1);
    });

    test(`panel editor footer stays on screen @ ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await signIn(page);
      await page.goto("/estimates/new");
      const done = page.getByRole("button", { name: "Done" });
      if (await done.isVisible()) await done.click();
      await page.locator("[data-panel=HOOD]").click();
      await page.waitForSelector("[data-panel-sheet=HOOD]");
      const footer = await page.evaluate(() => {
        const button = document.querySelector("[data-action=save-panel]");
        if (!button) return { top: -1, bottom: -1, height: 0 };
        const box = button.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom, height: window.innerHeight };
      });
      expect(footer.top).toBeGreaterThanOrEqual(0);
      expect(footer.bottom).toBeLessThanOrEqual(footer.height + 1);
      expect(await overflowPx(page)).toBeLessThanOrEqual(1);
    });
  }
});
